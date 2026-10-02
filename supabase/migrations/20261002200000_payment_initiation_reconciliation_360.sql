-- Payment initiation, customer Pay Now, return/callback reconciliation 360.
-- Additive only. Provider secrets remain environment-only and are never returned to customers.

ALTER TABLE public.payment_provider_events
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS payment_provider_events_invoice_idx
  ON public.payment_provider_events(invoice_id, received_at DESC);

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS initiated_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('order','invoice')),
  target_id uuid NOT NULL,
  gateway_key text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('mpesa','card','bank_transfer')),
  idempotency_key text NOT NULL UNIQUE,
  public_token_hash text,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','pending','successful','failed','expired','cancelled')),
  return_url text,
  failure_reason text,
  provider_request_id text,
  provider_checkout_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_attempts_target_idx ON public.payment_attempts(target_type,target_id,created_at DESC);
CREATE INDEX IF NOT EXISTS payment_attempts_tx_idx ON public.payment_attempts(payment_transaction_id);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM anon, authenticated;

-- Staff-only visibility of payment attempts; customer status is exposed through the RPC below.
GRANT SELECT ON public.payment_attempts TO authenticated;
DROP POLICY IF EXISTS payment_attempts_staff_read ON public.payment_attempts;
CREATE POLICY payment_attempts_staff_read ON public.payment_attempts FOR SELECT TO authenticated
  USING (private.current_user_has_permission('finance','select'));

CREATE OR REPLACE FUNCTION public.get_customer_payment_status(p_target_type text, p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_user uuid; v_email text; v_customer uuid; v_result jsonb;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id=v_user;
  SELECT id INTO v_customer FROM public.customers WHERE lower(trim(email))=lower(trim(v_email)) ORDER BY created_at LIMIT 1;
  IF p_target_type='order' THEN
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id=p_target_id AND (customer_id=v_customer OR lower(trim(customer_email))=lower(trim(v_email)))) THEN RAISE EXCEPTION 'Payment target not found'; END IF;
    SELECT jsonb_build_object('target_type','order','target_id',o.id,'order_number',o.order_number,'total_amount',o.total_amount,'payment_status',o.payment_status,'payments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pt.id,'amount',pt.amount,'method',pt.method,'status',pt.status,'provider',pt.provider,'reference',pt.provider_reference,'created_at',pt.created_at,'paid_at',pt.paid_at) ORDER BY pt.created_at DESC) FROM public.payment_transactions pt WHERE pt.order_id=o.id),'[]'::jsonb)) INTO v_result FROM public.orders o WHERE o.id=p_target_id;
  ELSIF p_target_type='invoice' THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id=p_target_id AND (customer_id=v_customer OR lower(trim(customer_email))=lower(trim(v_email)))) THEN RAISE EXCEPTION 'Payment target not found'; END IF;
    SELECT jsonb_build_object('target_type','invoice','target_id',i.id,'invoice_number',i.invoice_number,'total_amount',i.total_amount,'amount_paid',i.amount_paid,'balance_due',GREATEST(i.total_amount-i.amount_paid,0),'status',i.status,'payments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'amount',p.amount,'method',p.method,'reference',p.reference,'paid_at',p.paid_at) ORDER BY p.paid_at DESC) FROM public.payments p WHERE p.invoice_id=i.id),'[]'::jsonb)) INTO v_result FROM public.invoices i WHERE i.id=p_target_id;
  ELSE RAISE EXCEPTION 'Invalid payment target'; END IF;
  RETURN COALESCE(v_result,'{}'::jsonb);
END;$function$;
REVOKE ALL ON FUNCTION public.get_customer_payment_status(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_payment_status(text,uuid) TO authenticated;

-- Server-side reconciliation for bank transfers and controlled manual payment review.
CREATE OR REPLACE FUNCTION public.reconcile_payment_attempt_360(p_attempt_id uuid,p_success boolean,p_reference text DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_user uuid; v_attempt public.payment_attempts%ROWTYPE; v_tx public.payment_transactions%ROWTYPE; v_order public.orders%ROWTYPE; v_invoice public.invoices%ROWTYPE; v_paid numeric; v_status text;
BEGIN
  v_user:=private.require_staff_permission('finance','update');
  SELECT * INTO v_attempt FROM public.payment_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment attempt not found'; END IF;
  SELECT * INTO v_tx FROM public.payment_transactions WHERE id=v_attempt.payment_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment transaction not found'; END IF;
  IF v_attempt.payment_method<>'bank_transfer' THEN RAISE EXCEPTION 'Only bank transfers require manual reconciliation'; END IF;
  IF v_tx.status IN ('successful','failed','reversed') THEN RETURN jsonb_build_object('success',true,'status',v_tx.status,'idempotent_replay',true); END IF;
  IF NOT p_success THEN
    UPDATE public.payment_transactions SET status='failed',failure_reason=COALESCE(NULLIF(trim(p_notes),''),'Bank transfer could not be verified'),updated_at=now(),completed_at=now() WHERE id=v_tx.id;
    UPDATE public.payment_attempts SET status='failed',failure_reason=COALESCE(NULLIF(trim(p_notes),''),'Bank transfer could not be verified'),updated_at=now() WHERE id=v_attempt.id;
    RETURN jsonb_build_object('success',true,'status','failed');
  END IF;
  UPDATE public.payment_transactions SET status='successful',provider_reference=COALESCE(NULLIF(trim(p_reference),''),provider_reference),notes=COALESCE(NULLIF(trim(p_notes),''),notes),paid_at=now(),completed_at=now(),updated_at=now() WHERE id=v_tx.id;
  IF v_attempt.target_type='order' THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_attempt.target_id FOR UPDATE;
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful';
    IF v_paid>v_order.total_amount THEN RAISE EXCEPTION 'Payment ledger exceeds order total'; END IF;
    v_status:=CASE WHEN v_paid>=v_order.total_amount THEN 'paid' WHEN v_paid>0 THEN 'partial' ELSE 'pending' END;
    UPDATE public.orders SET payment_status=v_status,status=CASE WHEN v_status='paid' AND status='pending' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=v_order.id;
  ELSE
    SELECT * INTO v_invoice FROM public.invoices WHERE id=v_attempt.target_id FOR UPDATE;
    IF NOT FOUND OR v_invoice.status='cancelled' THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
    INSERT INTO public.payments(invoice_id,amount,method,reference,recorded_by,notes) VALUES(v_invoice.id,v_tx.amount,'bank_transfer',COALESCE(p_reference,v_tx.provider_reference),v_user,p_notes);
    IF v_invoice.amount_paid+v_tx.amount>v_invoice.total_amount THEN RAISE EXCEPTION 'Payment exceeds invoice balance'; END IF;
    v_status:=CASE WHEN v_invoice.amount_paid+v_tx.amount>=v_invoice.total_amount THEN 'paid' ELSE 'partial' END;
    UPDATE public.invoices SET amount_paid=amount_paid+v_tx.amount,status=v_status,updated_at=now() WHERE id=v_invoice.id;
  END IF;
  UPDATE public.payment_attempts SET status='successful',updated_at=now() WHERE id=v_attempt.id;
  RETURN jsonb_build_object('success',true,'status','successful','target_type',v_attempt.target_type,'target_id',v_attempt.target_id,'payment_transaction_id',v_tx.id,'reconciled_by',v_user);
END;$function$;
REVOKE ALL ON FUNCTION public.reconcile_payment_attempt_360(uuid,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_attempt_360(uuid,boolean,text,text) TO authenticated;

COMMENT ON TABLE public.payment_attempts IS 'Canonical payment initiation/session ledger. Provider credentials remain outside the database in Edge Function secrets.';

-- New callback application boundary for both order and invoice payments.
CREATE OR REPLACE FUNCTION public.apply_customer_payment_provider_event(
  p_provider text,p_provider_event_id text,p_event_type text,p_status text,p_amount numeric,p_currency text,
  p_order_id uuid DEFAULT NULL,p_invoice_id uuid DEFAULT NULL,p_provider_transaction_id text DEFAULT NULL,p_provider_reference text DEFAULT NULL,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_event public.payment_provider_events%ROWTYPE; v_tx public.payment_transactions%ROWTYPE; v_order public.orders%ROWTYPE; v_invoice public.invoices%ROWTYPE; v_attempt public.payment_attempts%ROWTYPE; v_paid numeric; v_new text; v_type text:=lower(trim(coalesce(p_event_type,''))); v_provider text:=lower(trim(coalesce(p_provider,''))); v_event_id text:=trim(coalesce(p_provider_event_id,'')); v_hash text;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Payment provider event boundary is service-role only'; END IF;
 IF v_provider='' OR v_event_id='' THEN RAISE EXCEPTION 'Provider and event id are required'; END IF;
 IF upper(coalesce(p_currency,'KES'))<>'KES' THEN RAISE EXCEPTION 'Unsupported payment currency'; END IF;
 v_hash:=encode(pg_catalog.digest(coalesce(p_payload,'{}'::jsonb)::text,'sha256'),'hex');
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
REVOKE ALL ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) TO service_role;

COMMENT ON COLUMN public.payment_gateway_methods.public_config IS 'Only non-secret customer-safe configuration. Server-only initiation URLs and credentials are filtered from customer RPC output.';

CREATE OR REPLACE FUNCTION public.get_customer_payment_methods(p_context text DEFAULT 'checkout')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'gateway_key',gateway_key,'provider',provider,'payment_method',payment_method,
      'display_name',display_name,'customer_description',customer_description,'icon_key',icon_key,
      'requires_customer_phone',requires_customer_phone,
      'public_config',COALESCE((SELECT jsonb_object_agg(k,v) FROM jsonb_each(public_config) AS e(k,v)
        WHERE k !~* '(secret|token|password|private|api[_-]?key|credential|passkey|signature|initiation[_-]?url|webhook[_-]?url|callback[_-]?url)'), '{}'::jsonb)
    ) ORDER BY sort_order,display_name
  ),'[]'::jsonb)
  FROM public.payment_gateway_methods
  WHERE is_enabled=true AND customer_visible=true
    AND CASE p_context WHEN 'checkout' THEN supports_checkout WHEN 'order' THEN supports_orders WHEN 'invoice' THEN supports_invoices ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.get_customer_payment_methods(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_payment_methods(text) TO anon,authenticated;
