-- Phase 4 — order cancellation idempotency, delivery-state integrity and refund ledger correctness.
-- Preserves existing RPC signatures and the established order/finance workflows.

CREATE OR REPLACE FUNCTION public.update_order_status_transaction(
  p_order_id uuid,
  p_status text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid;
  v_order public.orders%ROWTYPE;
  v_delivery record;
  v_allowed boolean := false;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF p_status NOT IN ('pending','confirmed','processing','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Terminal-state replays must be harmless. In particular, a repeated cancel
  -- must never decrement coupon usage a second time.
  IF v_order.status=p_status THEN
    RETURN jsonb_build_object('success',true,'order_id',p_order_id,'old_status',v_order.status,'status',v_order.status,'idempotent_replay',true,'updated_by',v_user);
  END IF;
  IF v_order.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'Terminal orders cannot be reopened or changed';
  END IF;

  v_allowed := CASE v_order.status
    WHEN 'pending' THEN p_status IN ('confirmed','processing','cancelled')
    WHEN 'confirmed' THEN p_status IN ('processing','completed','cancelled')
    WHEN 'processing' THEN p_status IN ('completed','cancelled')
    ELSE false
  END;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid order status transition: % to %',v_order.status,p_status;
  END IF;

  IF p_status='cancelled' THEN
    IF v_order.payment_status IN ('paid','partial') THEN
      RAISE EXCEPTION 'Paid or partially paid orders require payment/refund handling before cancellation';
    END IF;
    -- Once a delivery has left the warehouse, cancellation is no longer a
    -- safe order-state-only operation. Staff must resolve the delivery first.
    IF EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id=p_order_id AND d.status IN ('dispatched','in_transit','delivered')) THEN
      RAISE EXCEPTION 'An order with a dispatched or completed delivery cannot be cancelled';
    END IF;

    FOR v_delivery IN
      SELECT id,status FROM public.deliveries
      WHERE order_id=p_order_id AND status NOT IN ('cancelled','delivered')
      FOR UPDATE
    LOOP
      UPDATE public.deliveries SET status='cancelled',updated_at=now() WHERE id=v_delivery.id;
      INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,note,created_by)
      VALUES(v_delivery.id,p_order_id,'updated',v_delivery.status,'cancelled','Order cancelled',v_user);
    END LOOP;

    UPDATE public.inventory_reservations
       SET status='released',released_at=now(),updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';

    IF v_order.coupon_id IS NOT NULL AND v_order.payment_status IN ('pending','failed') THEN
      UPDATE public.coupons SET current_uses=GREATEST(current_uses-1,0)
      WHERE id=v_order.coupon_id;
    END IF;
  END IF;

  UPDATE public.orders SET status=p_status,updated_at=now() WHERE id=p_order_id;
  RETURN jsonb_build_object('success',true,'order_id',p_order_id,'old_status',v_order.status,'status',p_status,'updated_by',v_user);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_order_status_transaction(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_transaction(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_order_refund_request(
  p_order_id uuid,
  p_amount numeric,
  p_reason text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid;
  v_order public.orders%ROWTYPE;
  v_existing public.payment_refunds%ROWTYPE;
  v_payment public.payment_transactions%ROWTYPE;
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_remaining numeric(12,2);
  v_payment_refunded numeric(12,2);
  v_payment_remaining numeric(12,2);
  v_key text := NULLIF(trim(coalesce(p_idempotency_key,'')),'');
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) THEN
    RAISE EXCEPTION 'Refund amount must be positive and use at most two decimal places';
  END IF;
  IF v_key IS NOT NULL AND length(v_key)>200 THEN RAISE EXCEPTION 'Refund idempotency key is too long'; END IF;
  IF p_reason IS NOT NULL AND length(p_reason)>1000 THEN RAISE EXCEPTION 'Refund reason is too long'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.payment_refunds WHERE idempotency_key=v_key;
    IF FOUND THEN
      IF v_existing.order_id IS DISTINCT FROM p_order_id OR v_existing.amount IS DISTINCT FROM p_amount THEN
        RAISE EXCEPTION 'Refund idempotency key was already used for a different order or amount';
      END IF;
      RETURN jsonb_build_object('success',true,'refund_id',v_existing.id,'status',v_existing.status,'idempotent_replay',true);
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions
  WHERE order_id=p_order_id AND status='successful';
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds
  WHERE order_id=p_order_id AND status IN ('pending','processing','successful');
  v_remaining := GREATEST(v_paid-v_refunded,0);
  IF p_amount>v_remaining THEN RAISE EXCEPTION 'Refund exceeds refundable amount'; END IF;

  -- A refund row references exactly one payment transaction. Do not attach a
  -- larger aggregate refund to an arbitrary latest payment: allocate only when
  -- one payment transaction has enough unrefunded balance. Split multi-payment
  -- refunds into separate requests, preserving the existing schema contract.
  FOR v_payment IN
    SELECT pt.* FROM public.payment_transactions pt
    WHERE pt.order_id=p_order_id AND pt.status='successful'
    ORDER BY pt.created_at DESC,pt.id DESC
    FOR UPDATE
  LOOP
    SELECT COALESCE(SUM(pr.amount),0) INTO v_payment_refunded
    FROM public.payment_refunds pr
    WHERE pr.payment_transaction_id=v_payment.id AND pr.status IN ('pending','processing','successful');
    v_payment_remaining := GREATEST(v_payment.amount-v_payment_refunded,0);
    IF v_payment_remaining>=p_amount THEN
      INSERT INTO public.payment_refunds(payment_transaction_id,order_id,amount,status,idempotency_key,reason,created_by)
      VALUES(v_payment.id,p_order_id,p_amount,'pending',v_key,left(p_reason,1000),v_user)
      RETURNING * INTO v_existing;
      RETURN jsonb_build_object('success',true,'refund_id',v_existing.id,'order_id',p_order_id,'payment_transaction_id',v_payment.id,'amount',p_amount,'status','pending');
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Refund exceeds the remaining balance of any single payment. Split the refund across payment transactions.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_order_refund(
  p_refund_id uuid,
  p_success boolean,
  p_provider_refund_id text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid;
  v_refund public.payment_refunds%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_new_payment_status text;
  v_provider text := NULLIF(lower(trim(coalesce(p_provider,''))),'');
  v_provider_refund_id text := NULLIF(trim(coalesce(p_provider_refund_id,'')),'');
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_success IS NULL THEN RAISE EXCEPTION 'Refund outcome is required'; END IF;
  IF p_success AND (v_provider IS NULL OR v_provider_refund_id IS NULL) THEN
    RAISE EXCEPTION 'Successful refund completion requires provider and provider refund id';
  END IF;
  IF v_provider IS NOT NULL AND length(v_provider)>80 THEN RAISE EXCEPTION 'Refund provider is invalid'; END IF;
  IF v_provider_refund_id IS NOT NULL AND length(v_provider_refund_id)>200 THEN RAISE EXCEPTION 'Provider refund id is invalid'; END IF;
  IF p_notes IS NOT NULL AND length(p_notes)>1000 THEN RAISE EXCEPTION 'Refund notes are too long'; END IF;

  SELECT * INTO v_refund FROM public.payment_refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  IF v_refund.status IN ('successful','failed','reversed') THEN
    IF v_refund.status='successful' AND (v_provider_refund_id IS DISTINCT FROM v_refund.provider_refund_id OR v_provider IS DISTINCT FROM v_refund.provider) THEN
      RAISE EXCEPTION 'Completed refund cannot be replayed with different provider identity';
    END IF;
    RETURN jsonb_build_object('success',true,'refund_id',v_refund.id,'status',v_refund.status,'idempotent_replay',true);
  END IF;

  IF v_refund.order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_refund.order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund order no longer exists'; END IF;
  END IF;

  UPDATE public.payment_refunds
  SET status=CASE WHEN p_success THEN 'successful' ELSE 'failed' END,
      provider=v_provider,provider_refund_id=v_provider_refund_id,
      processed_at=CASE WHEN p_success THEN now() ELSE NULL END,
      reason=CASE WHEN p_notes IS NULL THEN reason ELSE left(concat_ws(' | ',NULLIF(reason,''),p_notes),1000) END,
      updated_at=now()
  WHERE id=p_refund_id;

  IF p_success AND v_refund.order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions
    WHERE order_id=v_refund.order_id AND status='successful';
    SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds
    WHERE order_id=v_refund.order_id AND status='successful';
    IF v_refunded>v_paid THEN RAISE EXCEPTION 'Refunds exceed successful payments'; END IF;
    v_new_payment_status := CASE
      WHEN v_refunded>0 AND v_refunded>=v_paid THEN 'refunded'
      WHEN v_refunded>0 THEN 'partial'
      WHEN v_paid>=v_order.total_amount AND v_paid>0 THEN 'paid'
      WHEN v_paid>0 THEN 'partial'
      ELSE 'pending'
    END;
    UPDATE public.orders SET payment_status=v_new_payment_status,updated_at=now()
    WHERE id=v_refund.order_id;
  END IF;

  RETURN jsonb_build_object('success',true,'refund_id',p_refund_id,'status',CASE WHEN p_success THEN 'successful' ELSE 'failed' END,'updated_by',v_user);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_refund_request(uuid,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_order_refund_request(uuid,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) TO authenticated;

COMMENT ON FUNCTION public.update_order_status_transaction(uuid,text) IS 'Permission-aware order transition; cancellation is replay-safe, releases stock and coupon usage once, and cancels only pre-dispatch deliveries.';
COMMENT ON FUNCTION public.create_order_refund_request(uuid,numeric,text,text) IS 'Creates a replay-safe refund request tied to a single payment transaction with per-transaction refundable balance enforcement.';
COMMENT ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) IS 'Completes a finance-authorized refund once and derives payment status from paid and refunded ledger totals.';
