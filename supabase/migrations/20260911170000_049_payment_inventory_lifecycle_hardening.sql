-- Phase 51–53: payment + inventory lifecycle hardening
-- Keeps the provider boundary server-side and prevents payment from bypassing stock reservations.

CREATE OR REPLACE FUNCTION public.update_order_status_transaction(
  p_order_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE v_user uuid; v_old text; v_payment_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT status, payment_status INTO v_old, v_payment_status
    FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status NOT IN ('pending','confirmed','processing','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;
  IF v_old='completed' AND p_status<>'completed' THEN
    RAISE EXCEPTION 'Completed orders cannot be reopened';
  END IF;
  IF v_old='cancelled' AND p_status<>'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be reopened';
  END IF;
  IF p_status='cancelled' AND v_payment_status IN ('paid','partial') THEN
    RAISE EXCEPTION 'Paid or partially paid orders require payment/refund handling before cancellation';
  END IF;

  IF p_status='cancelled' THEN
    UPDATE public.inventory_reservations
       SET status='released',released_at=now(),updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';

    IF EXISTS (
      SELECT 1 FROM public.orders
       WHERE id=p_order_id AND coupon_id IS NOT NULL
         AND payment_status IN ('pending','failed')
    ) THEN
      UPDATE public.coupons c
         SET current_uses=GREATEST(c.current_uses-1,0)
        FROM public.orders o
       WHERE o.id=p_order_id AND c.id=o.coupon_id;
    END IF;
  END IF;

  UPDATE public.orders SET status=p_status,updated_at=now() WHERE id=p_order_id;
  RETURN jsonb_build_object('success',true,'order_id',p_order_id,'old_status',v_old,'status',p_status,'updated_by',v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_order_payment_transaction(
  p_order_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_transaction_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE
  v_user uuid; v_order public.orders%ROWTYPE; v_paid numeric(12,2);
  v_item record; v_tx public.payment_transactions%ROWTYPE; v_status text;
  v_remaining numeric(12,2); v_reserved numeric(12,2);
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_method NOT IN ('mpesa','card','bank_transfer','cash','cheque','other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_tx FROM public.payment_transactions
     WHERE idempotency_key=trim(p_idempotency_key);
    IF FOUND THEN
      RETURN jsonb_build_object('success',true,'payment_id',v_tx.id,'status',v_tx.status,'idempotent_replay',true);
    END IF;
  END IF;

  IF p_provider IS NOT NULL AND p_provider_transaction_id IS NOT NULL THEN
    SELECT * INTO v_tx FROM public.payment_transactions
     WHERE provider=p_provider AND provider_transaction_id=p_provider_transaction_id;
    IF FOUND THEN
      RETURN jsonb_build_object('success',true,'payment_id',v_tx.id,'status',v_tx.status,'idempotent_replay',true);
    END IF;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status='cancelled' THEN RAISE EXCEPTION 'Cancelled order cannot receive payment'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM public.payment_transactions
   WHERE order_id=p_order_id AND status='successful';
  v_remaining := GREATEST(v_order.total_amount-v_paid,0);
  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds outstanding order balance';
  END IF;

  -- A final payment may only consume stock that is still actively reserved.
  -- Partial payments retain their reservations; expired reservations block further payment.
  IF p_amount = v_remaining THEN
    FOR v_item IN
      SELECT oi.product_id, SUM(oi.quantity)::numeric AS required_qty
        FROM public.order_items oi
       WHERE oi.order_id=p_order_id
       GROUP BY oi.product_id
    LOOP
      SELECT COALESCE(SUM(r.quantity),0) INTO v_reserved
        FROM public.inventory_reservations r
       WHERE r.order_id=p_order_id
         AND r.product_id=v_item.product_id
         AND r.status='reserved';
      IF v_reserved < v_item.required_qty THEN
        RAISE EXCEPTION 'Order stock reservation is no longer available';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.payment_transactions(
    order_id,amount,method,provider,provider_transaction_id,
    provider_reference,status,idempotency_key,notes,paid_at,created_by
  ) VALUES(
    p_order_id,p_amount,p_method,p_provider,p_provider_transaction_id,
    p_reference,'successful',nullif(trim(coalesce(p_idempotency_key,'')),''),p_notes,now(),v_user
  ) RETURNING * INTO v_tx;

  v_paid := v_paid + p_amount;
  v_status := CASE
    WHEN v_paid >= v_order.total_amount THEN 'paid'
    WHEN v_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.orders
     SET payment_status=v_status,
         status=CASE WHEN v_status='paid' AND status='pending' THEN 'confirmed' ELSE status END,
         updated_at=now()
   WHERE id=p_order_id;

  IF v_status='paid' THEN
    FOR v_item IN
      SELECT r.product_id, SUM(r.quantity)::integer AS qty
        FROM public.inventory_reservations r
       WHERE r.order_id=p_order_id AND r.status='reserved'
       GROUP BY r.product_id
    LOOP
      SELECT stock_quantity INTO v_reserved
        FROM public.products WHERE id=v_item.product_id FOR UPDATE;
      IF v_reserved < v_item.qty THEN
        RAISE EXCEPTION 'Insufficient stock to complete payment';
      END IF;

      UPDATE public.products
         SET stock_quantity=stock_quantity-v_item.qty,
             in_stock=(stock_quantity-v_item.qty > 0),
             updated_at=now()
       WHERE id=v_item.product_id;

      INSERT INTO public.inventory_movements(
        product_id,movement_type,quantity,reference_type,reference_id,notes,created_by
      ) VALUES(
        v_item.product_id,'out',v_item.qty,
        'order',p_order_id::text,'Stock consumed by paid ecommerce order',v_user
      );
    END LOOP;

    UPDATE public.inventory_reservations
       SET status='converted',updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';
  END IF;

  RETURN jsonb_build_object(
    'success',true,'payment_id',v_tx.id,'order_id',p_order_id,
    'amount_paid',v_paid,'payment_status',v_status
  );
END;
$$;

-- Keep the lifecycle functions callable only through their intended RPC boundary.
REVOKE EXECUTE ON FUNCTION public.update_order_status_transaction(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_order_payment_transaction(uuid,numeric,text,text,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_transaction(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_transaction(uuid,numeric,text,text,text,text,text,text) TO authenticated;
