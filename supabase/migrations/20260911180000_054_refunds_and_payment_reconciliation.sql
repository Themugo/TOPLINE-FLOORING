-- Phase 54: refund + reconciliation foundation
-- All payment/refund state changes stay inside server-side RPC boundaries.

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','successful','failed','reversed')),
  provider text,
  provider_refund_id text,
  idempotency_key text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_refunds_idempotency_idx
  ON public.payment_refunds(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_refunds_provider_ref_idx
  ON public.payment_refunds(provider, provider_refund_id)
  WHERE provider IS NOT NULL AND provider_refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_refunds_order_idx
  ON public.payment_refunds(order_id, created_at DESC);

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_refunds FROM anon, authenticated;
GRANT SELECT ON public.payment_refunds TO authenticated;
DROP POLICY IF EXISTS payment_refunds_staff_read ON public.payment_refunds;
CREATE POLICY payment_refunds_staff_read ON public.payment_refunds
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('finance','select'));

CREATE OR REPLACE FUNCTION public.create_order_refund_request(
  p_order_id uuid,
  p_amount numeric,
  p_reason text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid; v_order public.orders%ROWTYPE; v_paid numeric(12,2); v_refunded numeric(12,2); v_remaining numeric(12,2);
  v_payment_id uuid; v_refund public.payment_refunds%ROWTYPE;
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Refund amount must be positive'; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_refund FROM public.payment_refunds WHERE idempotency_key=trim(p_idempotency_key);
    IF FOUND THEN RETURN jsonb_build_object('success',true,'refund_id',v_refund.id,'status',v_refund.status,'idempotent_replay',true); END IF;
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=p_order_id AND status='successful';
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds WHERE order_id=p_order_id AND status IN ('pending','processing','successful');
  v_remaining := GREATEST(v_paid-v_refunded,0);
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'Refund exceeds refundable amount'; END IF;
  SELECT id INTO v_payment_id FROM public.payment_transactions WHERE order_id=p_order_id AND status='successful' ORDER BY created_at DESC LIMIT 1;
  IF v_payment_id IS NULL THEN RAISE EXCEPTION 'No successful payment exists for this order'; END IF;
  INSERT INTO public.payment_refunds(payment_transaction_id,order_id,amount,status,idempotency_key,reason,created_by)
  VALUES(v_payment_id,p_order_id,p_amount,'pending',NULLIF(trim(COALESCE(p_idempotency_key,'')),''),p_reason,v_user)
  RETURNING * INTO v_refund;
  RETURN jsonb_build_object('success',true,'refund_id',v_refund.id,'order_id',p_order_id,'amount',p_amount,'status','pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_order_refund(
  p_refund_id uuid,
  p_success boolean,
  p_provider_refund_id text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_user uuid; v_refund public.payment_refunds%ROWTYPE; v_order public.orders%ROWTYPE; v_total_refunded numeric(12,2);
BEGIN
  v_user := private.require_staff_permission('finance','update');
  SELECT * INTO v_refund FROM public.payment_refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  IF v_refund.status IN ('successful','failed','reversed') THEN
    RETURN jsonb_build_object('success',true,'refund_id',v_refund.id,'status',v_refund.status,'idempotent_replay',true);
  END IF;
  UPDATE public.payment_refunds
     SET status=CASE WHEN p_success THEN 'successful' ELSE 'failed' END,
         provider=p_provider, provider_refund_id=p_provider_refund_id,
         processed_at=CASE WHEN p_success THEN now() ELSE NULL END,
         reason=CASE WHEN p_notes IS NULL THEN reason ELSE COALESCE(reason,'') || CASE WHEN reason IS NULL OR reason='' THEN '' ELSE ' | ' END || p_notes END,
         updated_at=now()
   WHERE id=p_refund_id;
  IF p_success AND v_refund.order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_refund.order_id FOR UPDATE;
    SELECT COALESCE(SUM(amount),0) INTO v_total_refunded FROM public.payment_refunds WHERE order_id=v_refund.order_id AND status='successful';
    UPDATE public.orders SET payment_status=CASE WHEN v_total_refunded >= v_order.total_amount THEN 'refunded' ELSE 'partial' END, updated_at=now()
      WHERE id=v_refund.order_id;
  END IF;
  RETURN jsonb_build_object('success',true,'refund_id',p_refund_id,'status',CASE WHEN p_success THEN 'successful' ELSE 'failed' END,'updated_by',v_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_refund_request(uuid,numeric,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_refund_request(uuid,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) TO authenticated;
