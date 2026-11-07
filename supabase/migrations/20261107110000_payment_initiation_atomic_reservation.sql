-- Serialize payment-attempt creation for one order/invoice. Edge Functions previously
-- performed a read for pending attempts and then inserted a transaction + attempt in
-- separate requests; two distinct idempotency keys could pass the read concurrently.
-- This RPC locks the payable target and creates both ledger rows in one transaction.

CREATE OR REPLACE FUNCTION public.create_payment_attempt_atomic_360(
  p_target_type text,
  p_target_id uuid,
  p_gateway_key text,
  p_payment_method text,
  p_provider text,
  p_amount numeric,
  p_currency text,
  p_customer_phone text,
  p_idempotency_key text,
  p_public_token_hash text,
  p_return_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_existing public.payment_attempts%ROWTYPE;
  v_tx public.payment_transactions%ROWTYPE;
  v_balance numeric(12,2);
  v_paid numeric(12,2);
  v_tx_id uuid;
  v_attempt_id uuid;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Payment attempt reservation is service-role only';
  END IF;
  IF p_target_type NOT IN ('order','invoice') OR p_target_id IS NULL THEN
    RAISE EXCEPTION 'A valid payment target is required';
  END IF;
  IF nullif(trim(coalesce(p_gateway_key,'')),'') IS NULL
     OR p_payment_method NOT IN ('mpesa','card','bank_transfer')
     OR nullif(trim(coalesce(p_idempotency_key,'')),'') IS NULL
     OR length(p_idempotency_key)>200
     OR nullif(trim(coalesce(p_public_token_hash,'')),'') IS NULL
     OR length(p_public_token_hash)<>64 THEN
    RAISE EXCEPTION 'Payment attempt identity is invalid';
  END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2)
     OR upper(coalesce(p_currency,'KES'))<>'KES' THEN
    RAISE EXCEPTION 'Payment amount or currency is invalid';
  END IF;

  -- Lock the target first. All payment starts for the same target serialize here.
  IF p_target_type='order' THEN
    SELECT * INTO v_order FROM public.orders WHERE id=p_target_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.status='cancelled' OR v_order.payment_status='refunded' THEN
      RAISE EXCEPTION 'Cancelled or refunded order cannot be paid';
    END IF;
    SELECT coalesce(sum(amount),0) INTO v_paid
      FROM public.payment_transactions WHERE order_id=p_target_id AND status='successful';
    v_balance:=greatest(v_order.total_amount-v_paid,0);
  ELSE
    SELECT * INTO v_invoice FROM public.invoices WHERE id=p_target_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
    IF v_invoice.status IN ('cancelled','paid') THEN RAISE EXCEPTION 'Invoice is not payable'; END IF;
    v_balance:=greatest(v_invoice.total_amount-coalesce(v_invoice.amount_paid,0),0);
  END IF;
  IF p_amount>v_balance THEN RAISE EXCEPTION 'Payment amount exceeds outstanding balance'; END IF;

  -- An idempotency replay is not a new attempt. Return a conflict marker without
  -- rotating the one-time status token while another request may be returning it.
  SELECT * INTO v_existing FROM public.payment_attempts
   WHERE idempotency_key=p_idempotency_key FOR UPDATE;
  IF FOUND THEN
    IF v_existing.target_type<>p_target_type OR v_existing.target_id<>p_target_id
       OR v_existing.gateway_key<>p_gateway_key OR v_existing.payment_method<>p_payment_method THEN
      RAISE EXCEPTION 'Idempotency key belongs to a different payment request';
    END IF;
    RETURN jsonb_build_object('success',true,'created',false,'reason','idempotency_replay',
      'attempt_id',v_existing.id,'payment_transaction_id',v_existing.payment_transaction_id,'status',v_existing.status);
  END IF;

  -- Do not create a second online charge while a prior request is still in its
  -- provider uncertainty window. Bank transfers are excluded because they do not
  -- dispatch an immediate charge and are reconciled manually.
  SELECT t.* INTO v_tx
    FROM public.payment_transactions t
   WHERE ((p_target_type='order' AND t.order_id=p_target_id)
       OR (p_target_type='invoice' AND t.invoice_id=p_target_id))
     AND t.status='pending'
     AND t.method<>'bank_transfer'
     AND coalesce(t.checkout_expires_at,t.created_at+interval '3 minutes')>now()
   ORDER BY t.created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('success',false,'created',false,'reason','payment_in_progress');
  END IF;

  INSERT INTO public.payment_transactions(
    order_id,invoice_id,amount,currency,method,provider,status,idempotency_key,
    metadata,customer_phone,initiated_at,created_at,updated_at
  ) VALUES (
    CASE WHEN p_target_type='order' THEN p_target_id ELSE NULL END,
    CASE WHEN p_target_type='invoice' THEN p_target_id ELSE NULL END,
    p_amount,'KES',p_payment_method,p_provider,'pending','attempt:'||p_idempotency_key,
    jsonb_build_object('gateway_key',p_gateway_key,'target_type',p_target_type,'initiation_outcome','not_dispatched'),
    nullif(trim(p_customer_phone),''),now(),now(),now()
  ) RETURNING id INTO v_tx_id;

  INSERT INTO public.payment_attempts(
    payment_transaction_id,target_type,target_id,gateway_key,payment_method,idempotency_key,
    public_token_hash,status,return_url,created_at,updated_at
  ) VALUES (
    v_tx_id,p_target_type,p_target_id,p_gateway_key,p_payment_method,p_idempotency_key,
    p_public_token_hash,'initiated',p_return_url,now(),now()
  ) RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('success',true,'created',true,'attempt_id',v_attempt_id,
    'payment_transaction_id',v_tx_id,'status','initiated');
END;
$function$;

REVOKE ALL ON FUNCTION public.create_payment_attempt_atomic_360(text,uuid,text,text,text,numeric,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_attempt_atomic_360(text,uuid,text,text,text,numeric,text,text,text,text,text) TO service_role;
COMMENT ON FUNCTION public.create_payment_attempt_atomic_360(text,uuid,text,text,text,numeric,text,text,text,text,text)
IS 'Atomically reserves a payment transaction and attempt under a locked order/invoice row to prevent concurrent duplicate provider charges.';
