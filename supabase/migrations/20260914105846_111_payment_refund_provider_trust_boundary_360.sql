-- Payment, refund and provider webhook trust-boundary 360
ALTER FUNCTION public.apply_payment_provider_event(text,text,text,text,numeric,text,text,text,text,jsonb) SET search_path = '';
ALTER FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) SET search_path = '';
ALTER FUNCTION public.create_order_refund_request(uuid,numeric,text,text) SET search_path = '';
ALTER FUNCTION public.get_finance_communications_analytics_360(integer) SET search_path = '';
ALTER FUNCTION public.get_finance_control_360(integer) SET search_path = '';
ALTER FUNCTION public.get_finance_operations_360(integer) SET search_path = '';
ALTER FUNCTION public.reconcile_finance_control_360(uuid) SET search_path = '';
ALTER FUNCTION public.reconcile_order_payment_totals(uuid) SET search_path = '';
ALTER FUNCTION public.reconcile_payment_provider_events(timestamptz) SET search_path = '';
ALTER FUNCTION public.record_invoice_payment_transaction(uuid,numeric,text,text,text) SET search_path = '';
ALTER FUNCTION public.record_order_payment_transaction(uuid,numeric,text,text,text,text,text,text) SET search_path = '';

ALTER TABLE public.payment_provider_events
  ADD CONSTRAINT payment_provider_events_event_id_length_check CHECK (length(provider_event_id) BETWEEN 1 AND 200),
  ADD CONSTRAINT payment_provider_events_provider_length_check CHECK (length(provider) BETWEEN 1 AND 80),
  ADD CONSTRAINT payment_provider_events_amount_nonnegative_check CHECK (amount IS NULL OR amount >= 0),
  ADD CONSTRAINT payment_provider_events_currency_check CHECK (currency IS NULL OR upper(currency) = 'KES');
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_amount_positive_check CHECK (amount > 0),
  ADD CONSTRAINT payment_transactions_provider_length_check CHECK (provider IS NULL OR length(provider) BETWEEN 1 AND 80),
  ADD CONSTRAINT payment_transactions_provider_tx_length_check CHECK (provider_transaction_id IS NULL OR length(provider_transaction_id) BETWEEN 1 AND 200),
  ADD CONSTRAINT payment_transactions_currency_check CHECK (currency IS NULL OR upper(currency) = 'KES');
ALTER TABLE public.payment_refunds
  ADD CONSTRAINT payment_refunds_idempotency_length_check CHECK (idempotency_key IS NULL OR length(idempotency_key) BETWEEN 1 AND 200),
  ADD CONSTRAINT payment_refunds_provider_length_check CHECK (provider IS NULL OR length(provider) BETWEEN 1 AND 80),
  ADD CONSTRAINT payment_refunds_provider_ref_length_check CHECK (provider_refund_id IS NULL OR length(provider_refund_id) BETWEEN 1 AND 200);

CREATE OR REPLACE FUNCTION public.apply_payment_provider_event(
  p_provider text,p_provider_event_id text,p_event_type text,p_status text,p_amount numeric,p_currency text,
  p_order_id text DEFAULT NULL,p_provider_transaction_id text DEFAULT NULL,p_provider_reference text DEFAULT NULL,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
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
  v_payload_hash:=encode(pg_catalog.digest(p_payload::text,'sha256'),'hex');
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

CREATE OR REPLACE FUNCTION public.complete_order_refund(p_refund_id uuid,p_success boolean,p_provider_refund_id text DEFAULT NULL,p_provider text DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_user uuid; v_refund public.payment_refunds%ROWTYPE; v_order public.orders%ROWTYPE; v_total_refunded numeric(12,2); v_provider text; v_provider_refund_id text;
BEGIN
  v_user:=private.require_staff_permission('finance','update'); v_provider:=nullif(lower(trim(coalesce(p_provider,''))),''); v_provider_refund_id:=nullif(trim(coalesce(p_provider_refund_id,'')),'');
  IF p_success AND (v_provider IS NULL OR v_provider_refund_id IS NULL) THEN RAISE EXCEPTION 'Successful refund completion requires provider and provider refund id'; END IF;
  IF v_provider IS NOT NULL AND length(v_provider)>80 THEN RAISE EXCEPTION 'Refund provider is invalid'; END IF;
  IF v_provider_refund_id IS NOT NULL AND length(v_provider_refund_id)>200 THEN RAISE EXCEPTION 'Provider refund id is invalid'; END IF;
  SELECT * INTO v_refund FROM public.payment_refunds WHERE id=p_refund_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  IF v_refund.status IN ('successful','failed','reversed') THEN RETURN jsonb_build_object('success',true,'refund_id',v_refund.id,'status',v_refund.status,'idempotent_replay',true); END IF;
  UPDATE public.payment_refunds SET status=CASE WHEN p_success THEN 'successful' ELSE 'failed' END,provider=v_provider,provider_refund_id=v_provider_refund_id,processed_at=CASE WHEN p_success THEN now() ELSE NULL END,reason=CASE WHEN p_notes IS NULL THEN reason ELSE COALESCE(reason,'')||CASE WHEN reason IS NULL OR reason='' THEN '' ELSE ' | ' END||left(p_notes,1000) END,updated_at=now() WHERE id=p_refund_id;
  IF p_success AND v_refund.order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_refund.order_id FOR UPDATE;
    SELECT COALESCE(SUM(amount),0) INTO v_total_refunded FROM public.payment_refunds WHERE order_id=v_refund.order_id AND status='successful';
    IF v_total_refunded>(SELECT COALESCE(SUM(amount),0) FROM public.payment_transactions WHERE order_id=v_refund.order_id AND status='successful') THEN RAISE EXCEPTION 'Refunds exceed successful payments'; END IF;
    UPDATE public.orders SET payment_status=CASE WHEN v_total_refunded>=v_order.total_amount THEN 'refunded' ELSE 'partial' END,updated_at=now() WHERE id=v_refund.order_id;
  END IF;
  RETURN jsonb_build_object('success',true,'refund_id',p_refund_id,'status',CASE WHEN p_success THEN 'successful' ELSE 'failed' END,'updated_by',v_user);
END;$function$;

COMMENT ON FUNCTION public.apply_payment_provider_event(text,text,text,text,numeric,text,text,text,text,jsonb) IS 'Service-role-only payment provider webhook boundary with replay, identity, amount, currency and ledger invariants.';
COMMENT ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) IS 'Finance-authorized refund completion boundary with provider identity and refund-vs-payment invariant enforcement.';
