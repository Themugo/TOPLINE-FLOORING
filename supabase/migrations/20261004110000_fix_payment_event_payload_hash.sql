-- Payment provider events could never be applied: apply_payment_provider_event and
-- apply_customer_payment_provider_event hash the payload with pg_catalog.digest(), which does not
-- exist. pgcrypto's digest() lives in the `extensions` schema on Supabase (and in `public` on a plain
-- PostgreSQL install), never in pg_catalog, and both functions run with search_path = ''. Every call
-- therefore failed with "function pg_catalog.digest(text, unknown) does not exist", so no M-Pesa or
-- card callback could record a payment.
--
-- Fix: use the built-in SHA-256 (PostgreSQL 11+, schema pg_catalog) which needs no extension and
-- produces the same lowercase hex digest. Bodies, signatures, grants and search_path are unchanged;
-- CREATE OR REPLACE preserves privileges.

CREATE OR REPLACE FUNCTION public.apply_payment_provider_event(p_provider text, p_provider_event_id text, p_event_type text, p_status text, p_amount numeric, p_currency text, p_order_id text DEFAULT NULL::text, p_provider_transaction_id text DEFAULT NULL::text, p_provider_reference text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_event public.payment_provider_events%ROWTYPE; v_order public.orders%ROWTYPE; v_tx public.payment_transactions%ROWTYPE; v_order_id uuid;
  v_amount numeric(12,2); v_paid numeric(12,2); v_refunded numeric(12,2); v_new_status text; v_item record; v_reserved numeric(12,2); v_stock numeric(12,2);
  v_event_type text:=lower(trim(coalesce(p_event_type,''))); v_provider text:=lower(trim(coalesce(p_provider,''))); v_event_id text:=trim(coalesce(p_provider_event_id,''));
  v_currency text:=upper(trim(coalesce(p_currency,''))); v_provider_tx_id text:=nullif(trim(coalesce(p_provider_transaction_id,'')),'');
  v_provider_reference text:=nullif(trim(coalesce(p_provider_reference,'')),''); v_payload_hash text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Payment provider event boundary is service-role only'; END IF;
  IF v_provider='' OR v_event_id='' THEN RAISE EXCEPTION 'Provider and event id are required'; END IF;
  IF length(v_provider)>80 OR length(v_event_id)>200 THEN RAISE EXCEPTION 'Provider event identity is invalid'; END IF;
  IF v_currency='' THEN v_currency:='KES'; END IF;
  IF v_currency<>'KES' THEN RAISE EXCEPTION 'Unsupported payment currency'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Payment payload must be an object'; END IF;
  IF p_amount IS NOT NULL AND (p_amount<0 OR p_amount<>round(p_amount,2)) THEN RAISE EXCEPTION 'Payment amount is invalid'; END IF;
  v_payload_hash:=encode(pg_catalog.sha256(pg_catalog.convert_to(p_payload::text,'UTF8')),'hex');
  SELECT * INTO v_event FROM public.payment_provider_events WHERE provider=v_provider AND provider_event_id=v_event_id FOR UPDATE;
  IF FOUND THEN
    IF v_event.payload_hash<>v_payload_hash THEN UPDATE public.payment_provider_events SET status='failed',error_message='Replay with different payload hash',updated_at=now() WHERE id=v_event.id; RAISE EXCEPTION 'Provider event replay payload mismatch'; END IF;
    IF v_event.status IN ('processed','ignored') THEN RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status',v_event.status,'idempotent_replay',true); END IF;
    UPDATE public.payment_provider_events SET status='received',error_message=NULL,updated_at=now() WHERE id=v_event.id;
  END IF;
  v_order_id:=NULLIF(trim(coalesce(p_order_id,'')),'')::uuid; v_amount:=NULLIF(p_amount,0);
  IF v_amount IS NOT NULL AND v_amount<0 THEN RAISE EXCEPTION 'Payment amount cannot be negative'; END IF;
  INSERT INTO public.payment_provider_events(provider,provider_event_id,event_type,status,order_id,amount,currency,payload_hash,payload)
  VALUES(v_provider,v_event_id,coalesce(nullif(v_event_type,''),'unknown'),'received',v_order_id,v_amount,v_currency,v_payload_hash,p_payload) RETURNING * INTO v_event;
  IF v_event_type IN ('payment.success','payment.succeeded','payment.completed','charge.succeeded','paid','success','successful') AND v_order_id IS NOT NULL AND v_amount IS NOT NULL AND v_amount>0 THEN
    IF v_provider_tx_id IS NULL THEN UPDATE public.payment_provider_events SET status='failed',error_message='Successful provider event requires transaction id',updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',false,'event_id',v_event.id,'error','Successful provider event requires transaction id'); END IF;
    SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
    IF NOT FOUND THEN UPDATE public.payment_provider_events SET status='failed',error_message='Order not found',updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',false,'event_id',v_event.id,'error','Order not found'); END IF;
    IF v_order.status='cancelled' THEN UPDATE public.payment_provider_events SET status='failed',error_message='Cancelled order cannot receive payment',updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',false,'event_id',v_event.id,'error','Cancelled order cannot receive payment'); END IF;
    SELECT * INTO v_tx FROM public.payment_transactions WHERE provider=v_provider AND provider_transaction_id=v_provider_tx_id FOR UPDATE;
    IF FOUND THEN
      IF v_tx.amount<>v_amount OR v_tx.order_id IS DISTINCT FROM v_order_id OR upper(coalesce(v_tx.currency,'KES'))<>v_currency THEN RAISE EXCEPTION 'Provider transaction conflicts with existing payment'; END IF;
      IF v_tx.status<>'successful' THEN RAISE EXCEPTION 'Provider transaction is not in successful state'; END IF;
    ELSE
      SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order_id AND status='successful';
      IF v_paid+v_amount>v_order.total_amount THEN RAISE EXCEPTION 'Provider payment exceeds outstanding order balance'; END IF;
      INSERT INTO public.payment_transactions(order_id,amount,currency,method,provider,provider_transaction_id,provider_reference,status,idempotency_key,metadata,notes,paid_at,created_at,updated_at)
      VALUES(v_order_id,v_amount,v_currency,CASE WHEN v_provider='mpesa' THEN 'mpesa' WHEN v_provider IN ('stripe','card') THEN 'card' ELSE 'other' END,v_provider,v_provider_tx_id,v_provider_reference,'successful','provider-event:'||v_provider||':'||v_event_id,jsonb_build_object('provider_event_id',v_event_id,'event_type',v_event_type),'Provider webhook payment',now(),now(),now()) RETURNING * INTO v_tx;
    END IF;
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order_id AND status='successful';
    SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds WHERE order_id=v_order_id AND status='successful';
    IF v_paid>v_order.total_amount THEN RAISE EXCEPTION 'Order payment ledger exceeds order total'; END IF;
    IF v_refunded>v_paid THEN RAISE EXCEPTION 'Refund ledger exceeds successful payments'; END IF;
    v_new_status:=CASE WHEN v_refunded>=v_paid AND v_refunded>0 THEN 'refunded' WHEN v_paid>=v_order.total_amount THEN 'paid' WHEN v_paid>0 THEN 'partial' ELSE 'pending' END;
    UPDATE public.orders SET payment_status=v_new_status,status=CASE WHEN v_new_status='paid' AND status='pending' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=v_order_id;
    IF v_new_status='paid' THEN
      FOR v_item IN SELECT r.product_id,r.variant_id,SUM(r.quantity)::integer qty FROM public.inventory_reservations r WHERE r.order_id=v_order_id AND r.status='reserved' GROUP BY r.product_id,r.variant_id LOOP
        SELECT COALESCE(SUM(r.quantity),0) INTO v_reserved FROM public.inventory_reservations r WHERE r.order_id=v_order_id AND r.product_id=v_item.product_id AND r.variant_id IS NOT DISTINCT FROM v_item.variant_id AND r.status='reserved' AND (r.expires_at IS NULL OR r.expires_at>now());
        IF v_reserved<v_item.qty THEN RAISE EXCEPTION 'Order stock reservation is no longer available'; END IF;
        IF v_item.variant_id IS NOT NULL THEN
          SELECT stock_quantity INTO v_stock FROM public.product_variants WHERE id=v_item.variant_id FOR UPDATE;
          IF COALESCE(v_stock,0)<v_item.qty THEN RAISE EXCEPTION 'Insufficient variant stock to complete provider payment'; END IF;
          UPDATE public.product_variants SET stock_quantity=stock_quantity-v_item.qty,updated_at=now() WHERE id=v_item.variant_id;
          UPDATE public.products p SET in_stock=EXISTS(SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0),updated_at=now() WHERE p.id=v_item.product_id;
        ELSE
          SELECT stock_quantity INTO v_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE;
          IF COALESCE(v_stock,0)<v_item.qty THEN RAISE EXCEPTION 'Insufficient stock to complete provider payment'; END IF;
          UPDATE public.products SET stock_quantity=stock_quantity-v_item.qty,in_stock=(stock_quantity-v_item.qty>0),updated_at=now() WHERE id=v_item.product_id;
        END IF;
        INSERT INTO public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES(v_item.product_id,'out',v_item.qty,'order',v_order_id::text,CASE WHEN v_item.variant_id IS NOT NULL THEN 'Stock consumed by paid provider-confirmed ecommerce order variant' ELSE 'Stock consumed by paid provider-confirmed ecommerce order' END,NULL);
      END LOOP;
      UPDATE public.inventory_reservations SET status='converted',updated_at=now() WHERE order_id=v_order_id AND status='reserved';
    END IF;
    UPDATE public.payment_provider_events SET status='processed',payment_transaction_id=v_tx.id,processed_at=now(),updated_at=now() WHERE id=v_event.id;
    RETURN jsonb_build_object('success',true,'event_id',v_event.id,'payment_id',v_tx.id,'order_id',v_order_id,'payment_status',v_new_status);
  END IF;
  IF v_event_type IN ('payment.failed','payment.cancelled','charge.failed','failed','failure') AND v_order_id IS NOT NULL THEN UPDATE public.payment_provider_events SET status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status','processed','payment_status','failed'); END IF;
  UPDATE public.payment_provider_events SET status='ignored',processed_at=now(),updated_at=now() WHERE id=v_event.id;
  RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status','ignored');
EXCEPTION WHEN others THEN IF v_event.id IS NOT NULL THEN UPDATE public.payment_provider_events SET status='failed',error_message=left(SQLERRM,1000),updated_at=now() WHERE id=v_event.id; END IF; RAISE;
END;$function$;

CREATE OR REPLACE FUNCTION public.apply_customer_payment_provider_event(p_provider text, p_provider_event_id text, p_event_type text, p_status text, p_amount numeric, p_currency text, p_order_id uuid DEFAULT NULL::uuid, p_invoice_id uuid DEFAULT NULL::uuid, p_provider_transaction_id text DEFAULT NULL::text, p_provider_reference text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE v_event public.payment_provider_events%ROWTYPE; v_tx public.payment_transactions%ROWTYPE; v_order public.orders%ROWTYPE; v_invoice public.invoices%ROWTYPE; v_attempt public.payment_attempts%ROWTYPE; v_paid numeric; v_new text; v_type text:=lower(trim(coalesce(p_event_type,''))); v_provider text:=lower(trim(coalesce(p_provider,''))); v_event_id text:=trim(coalesce(p_provider_event_id,'')); v_hash text;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Payment provider event boundary is service-role only'; END IF;
 IF v_provider='' OR v_event_id='' THEN RAISE EXCEPTION 'Provider and event id are required'; END IF;
 IF upper(coalesce(p_currency,'KES'))<>'KES' THEN RAISE EXCEPTION 'Unsupported payment currency'; END IF;
 v_hash:=encode(pg_catalog.sha256(pg_catalog.convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8')),'hex');
 SELECT * INTO v_event FROM public.payment_provider_events WHERE provider=v_provider AND provider_event_id=v_event_id FOR UPDATE;
 IF FOUND THEN IF v_event.payload_hash<>v_hash THEN RAISE EXCEPTION 'Provider event replay payload mismatch'; END IF; IF v_event.status IN ('processed','ignored') THEN RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status',v_event.status,'idempotent_replay',true); END IF; END IF;
 INSERT INTO public.payment_provider_events(provider,provider_event_id,event_type,status,order_id,invoice_id,amount,currency,payload_hash,payload) VALUES(v_provider,v_event_id,v_type,'received',p_order_id,p_invoice_id,p_amount,'KES',v_hash,coalesce(p_payload,'{}'::jsonb)) ON CONFLICT(provider,provider_event_id) DO UPDATE SET status='received',updated_at=now() RETURNING * INTO v_event;
 SELECT * INTO v_tx FROM public.payment_transactions WHERE provider=v_provider AND provider_transaction_id=p_provider_transaction_id FOR UPDATE;
 IF NOT FOUND AND p_order_id IS NOT NULL THEN SELECT * INTO v_tx FROM public.payment_transactions WHERE order_id=p_order_id AND status='pending' AND provider=v_provider ORDER BY created_at DESC LIMIT 1 FOR UPDATE; END IF;
 IF NOT FOUND AND p_invoice_id IS NOT NULL THEN SELECT * INTO v_tx FROM public.payment_transactions WHERE invoice_id=p_invoice_id AND status='pending' AND provider=v_provider ORDER BY created_at DESC LIMIT 1 FOR UPDATE; END IF;
 IF v_tx.id IS NULL THEN UPDATE public.payment_provider_events SET status='failed',error_message='Payment transaction not found',updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',false,'error','Payment transaction not found','event_id',v_event.id); END IF;
 IF p_amount IS NOT NULL AND p_amount<>v_tx.amount THEN UPDATE public.payment_provider_events SET status='failed',error_message='Provider amount does not match payment transaction',updated_at=now() WHERE id=v_event.id; RAISE EXCEPTION 'Provider amount does not match payment transaction'; END IF;
 IF v_type IN ('payment.failed','payment.cancelled','charge.failed','failed','failure') OR lower(coalesce(p_status,'')) IN ('failed','cancelled','failure') THEN
   UPDATE public.payment_transactions SET status='failed',failure_reason=coalesce(nullif(p_payload->>'ResultDesc',''),nullif(p_payload->>'message',''),'Provider payment failed'),completed_at=now(),updated_at=now() WHERE id=v_tx.id;
   UPDATE public.payment_attempts SET status='failed',failure_reason=coalesce(nullif(p_payload->>'ResultDesc',''),nullif(p_payload->>'message',''),'Provider payment failed'),updated_at=now() WHERE payment_transaction_id=v_tx.id;
   UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
   RETURN jsonb_build_object('success',true,'status','failed','payment_transaction_id',v_tx.id);
 END IF;
 IF v_type NOT IN ('payment.success','payment.succeeded','payment.completed','charge.succeeded','paid','success','successful') AND lower(coalesce(p_status,'')) NOT IN ('successful','success','paid','completed') THEN UPDATE public.payment_provider_events SET status='ignored',processed_at=now(),updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',true,'status','ignored'); END IF;
 IF p_provider_transaction_id IS NULL OR trim(p_provider_transaction_id)='' THEN RAISE EXCEPTION 'Successful provider payment requires transaction id'; END IF;
 IF p_order_id IS NOT NULL THEN
   SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF; IF v_order.status='cancelled' THEN RAISE EXCEPTION 'Cancelled order cannot receive payment'; END IF;
   SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful' AND id<>v_tx.id;
   IF v_paid+v_tx.amount>v_order.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding order balance'; END IF;
   UPDATE public.payment_transactions SET status='successful',provider_transaction_id=p_provider_transaction_id,provider_reference=p_provider_reference,paid_at=now(),completed_at=now(),updated_at=now() WHERE id=v_tx.id;
   SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful';
   v_new:=CASE WHEN v_paid>=v_order.total_amount THEN 'paid' WHEN v_paid>0 THEN 'partial' ELSE 'pending' END;
   UPDATE public.orders SET payment_status=v_new,status=CASE WHEN v_new='paid' AND status='pending' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=v_order.id;
 ELSE
   SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE; IF NOT FOUND OR v_invoice.status='cancelled' THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
   IF v_invoice.amount_paid+v_tx.amount>v_invoice.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding invoice balance'; END IF;
   UPDATE public.payment_transactions SET status='successful',provider_transaction_id=p_provider_transaction_id,provider_reference=p_provider_reference,paid_at=now(),completed_at=now() WHERE id=v_tx.id;
   INSERT INTO public.payments(invoice_id,amount,method,reference,recorded_by,notes) VALUES(v_invoice.id,v_tx.amount,v_tx.method,p_provider_reference,NULL,'Provider payment reconciled');
   v_new:=CASE WHEN v_invoice.amount_paid+v_tx.amount>=v_invoice.total_amount THEN 'paid' ELSE 'partial' END;
   UPDATE public.invoices SET amount_paid=amount_paid+v_tx.amount,status=v_new,updated_at=now() WHERE id=v_invoice.id;
 END IF;
 UPDATE public.payment_attempts SET status='successful',provider_request_id=coalesce(provider_request_id,p_provider_transaction_id),provider_checkout_id=coalesce(provider_checkout_id,p_provider_transaction_id),updated_at=now() WHERE payment_transaction_id=v_tx.id;
 UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
 RETURN jsonb_build_object('success',true,'status','successful','payment_transaction_id',v_tx.id,'payment_status',v_new);
EXCEPTION WHEN others THEN IF v_event.id IS NOT NULL THEN UPDATE public.payment_provider_events SET status='failed',error_message=left(SQLERRM,1000),updated_at=now() WHERE id=v_event.id; END IF; RAISE;
END;$function$;
