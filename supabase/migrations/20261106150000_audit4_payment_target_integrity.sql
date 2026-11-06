-- Phase 4: payment callback target integrity.
-- A provider-signed callback may identify a transaction by provider reference,
-- but its order/invoice target must still match the transaction being settled.

CREATE OR REPLACE FUNCTION public.apply_customer_payment_provider_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_status text,
  p_amount numeric,
  p_currency text,
  p_order_id uuid DEFAULT NULL,
  p_invoice_id uuid DEFAULT NULL,
  p_provider_transaction_id text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE
  v_event public.payment_provider_events%ROWTYPE;
  v_tx public.payment_transactions%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_paid numeric;
  v_new text;
  v_type text := lower(trim(coalesce(p_event_type,'')));
  v_provider text := lower(trim(coalesce(p_provider,'')));
  v_event_id text := trim(coalesce(p_provider_event_id,''));
  v_hash text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Payment provider event boundary is service-role only';
  END IF;
  IF v_provider = '' OR v_event_id = '' THEN
    RAISE EXCEPTION 'Provider and event id are required';
  END IF;
  IF (p_order_id IS NULL) = (p_invoice_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one payment target is required';
  END IF;
  IF upper(coalesce(p_currency,'KES')) <> 'KES' THEN
    RAISE EXCEPTION 'Unsupported payment currency';
  END IF;

  v_hash := encode(extensions.digest(coalesce(p_payload,'{}'::jsonb)::text,'sha256'),'hex');
  SELECT * INTO v_event
    FROM public.payment_provider_events
   WHERE provider = v_provider AND provider_event_id = v_event_id
   FOR UPDATE;
  IF FOUND THEN
    IF v_event.payload_hash <> v_hash
       OR v_event.order_id IS DISTINCT FROM p_order_id
       OR v_event.invoice_id IS DISTINCT FROM p_invoice_id THEN
      RAISE EXCEPTION 'Provider event replay target or payload mismatch';
    END IF;
    IF v_event.status IN ('processed','ignored') THEN
      RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status',v_event.status,'idempotent_replay',true);
    END IF;
  END IF;

  INSERT INTO public.payment_provider_events(
    provider,provider_event_id,event_type,status,order_id,invoice_id,amount,currency,payload_hash,payload
  ) VALUES (
    v_provider,v_event_id,v_type,'received',p_order_id,p_invoice_id,p_amount,'KES',v_hash,coalesce(p_payload,'{}'::jsonb)
  )
  ON CONFLICT(provider,provider_event_id) DO UPDATE
    SET status='received', updated_at=now()
  RETURNING * INTO v_event;

  SELECT * INTO v_tx
    FROM public.payment_transactions
   WHERE provider = v_provider
     AND provider_transaction_id = p_provider_transaction_id
   FOR UPDATE;
  IF NOT FOUND AND p_order_id IS NOT NULL THEN
    SELECT * INTO v_tx
      FROM public.payment_transactions
     WHERE order_id = p_order_id AND status = 'pending' AND provider = v_provider
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;
  IF NOT FOUND AND p_invoice_id IS NOT NULL THEN
    SELECT * INTO v_tx
      FROM public.payment_transactions
     WHERE invoice_id = p_invoice_id AND status = 'pending' AND provider = v_provider
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;
  IF NOT FOUND OR v_tx.id IS NULL THEN
    UPDATE public.payment_provider_events SET status='failed',error_message='Payment transaction not found',updated_at=now() WHERE id=v_event.id;
    RETURN jsonb_build_object('success',false,'error','Payment transaction not found','event_id',v_event.id);
  END IF;

  IF (p_order_id IS NOT NULL AND v_tx.order_id IS DISTINCT FROM p_order_id)
     OR (p_invoice_id IS NOT NULL AND v_tx.invoice_id IS DISTINCT FROM p_invoice_id) THEN
    UPDATE public.payment_provider_events SET status='failed',error_message='Provider target does not match payment transaction',updated_at=now() WHERE id=v_event.id;
    RAISE EXCEPTION 'Provider target does not match payment transaction';
  END IF;
  IF p_amount IS NOT NULL AND p_amount <> v_tx.amount THEN
    UPDATE public.payment_provider_events SET status='failed',error_message='Provider amount does not match payment transaction',updated_at=now() WHERE id=v_event.id;
    RAISE EXCEPTION 'Provider amount does not match payment transaction';
  END IF;

  IF v_type IN ('payment.failed','payment.cancelled','charge.failed','failed','failure')
     OR lower(coalesce(p_status,'')) IN ('failed','cancelled','failure') THEN
    UPDATE public.payment_transactions
       SET status='failed',failure_reason=coalesce(nullif(p_payload->>'ResultDesc',''),nullif(p_payload->>'message',''),'Provider payment failed'),completed_at=now(),updated_at=now()
     WHERE id=v_tx.id;
    UPDATE public.payment_attempts
       SET status='failed',failure_reason=coalesce(nullif(p_payload->>'ResultDesc',''),nullif(p_payload->>'message',''),'Provider payment failed'),updated_at=now()
     WHERE payment_transaction_id=v_tx.id;
    UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
    RETURN jsonb_build_object('success',true,'status','failed','payment_transaction_id',v_tx.id);
  END IF;

  IF v_type NOT IN ('payment.success','payment.succeeded','payment.completed','charge.succeeded','paid','success','successful')
     AND lower(coalesce(p_status,'')) NOT IN ('successful','success','paid','completed') THEN
    UPDATE public.payment_provider_events SET status='ignored',processed_at=now(),updated_at=now() WHERE id=v_event.id;
    RETURN jsonb_build_object('success',true,'status','ignored');
  END IF;
  IF p_provider_transaction_id IS NULL OR trim(p_provider_transaction_id)='' THEN
    RAISE EXCEPTION 'Successful provider payment requires transaction id';
  END IF;

  IF p_order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.status='cancelled' THEN RAISE EXCEPTION 'Cancelled order cannot receive payment'; END IF;
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful' AND id<>v_tx.id;
    IF v_paid+v_tx.amount>v_order.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding order balance'; END IF;
    UPDATE public.payment_transactions SET status='successful',provider_transaction_id=p_provider_transaction_id,provider_reference=p_provider_reference,paid_at=now(),completed_at=now(),updated_at=now() WHERE id=v_tx.id;
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful';
    v_new:=CASE WHEN v_paid>=v_order.total_amount THEN 'paid' WHEN v_paid>0 THEN 'partial' ELSE 'pending' END;
    UPDATE public.orders SET payment_status=v_new,status=CASE WHEN v_new='paid' AND status='pending' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=v_order.id;
  ELSE
    SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
    IF NOT FOUND OR v_invoice.status='cancelled' THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
    IF v_invoice.amount_paid+v_tx.amount>v_invoice.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding invoice balance'; END IF;
    UPDATE public.payment_transactions SET status='successful',provider_transaction_id=p_provider_transaction_id,provider_reference=p_provider_reference,paid_at=now(),completed_at=now() WHERE id=v_tx.id;
    INSERT INTO public.payments(invoice_id,amount,method,reference,recorded_by,notes) VALUES(v_invoice.id,v_tx.amount,v_tx.method,p_provider_reference,NULL,'Provider payment reconciled');
    v_new:=CASE WHEN v_invoice.amount_paid+v_tx.amount>=v_invoice.total_amount THEN 'paid' ELSE 'partial' END;
    UPDATE public.invoices SET amount_paid=amount_paid+v_tx.amount,status=v_new,updated_at=now() WHERE id=v_invoice.id;
  END IF;

  UPDATE public.payment_attempts
     SET status='successful',provider_request_id=coalesce(provider_request_id,p_provider_transaction_id),provider_checkout_id=coalesce(provider_checkout_id,p_provider_transaction_id),updated_at=now()
   WHERE payment_transaction_id=v_tx.id;
  UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
  RETURN jsonb_build_object('success',true,'status','successful','payment_transaction_id',v_tx.id,'payment_status',v_new);
EXCEPTION WHEN others THEN
  IF v_event.id IS NOT NULL THEN
    UPDATE public.payment_provider_events SET status='failed',error_message=left(SQLERRM,1000),updated_at=now() WHERE id=v_event.id;
  END IF;
  RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) TO service_role;

COMMENT ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb)
  IS 'Service-role-only provider callback reconciliation with exact order/invoice target and transaction identity checks.';
