-- Operation 4: Finance Control 360
-- Converges order payments, invoices, collections, refunds and reconciliation
-- behind server-authoritative finance controls.

CREATE TABLE IF NOT EXISTS public.finance_control_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('invoice','payment','refund','order','reconciliation')),
  entity_id uuid,
  event_type text NOT NULL,
  amount numeric(12,2),
  from_status text,
  to_status text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_control_events_entity_idx ON public.finance_control_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS finance_control_events_created_idx ON public.finance_control_events(created_at DESC);
ALTER TABLE public.finance_control_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_control_events FROM anon, authenticated;
GRANT SELECT ON public.finance_control_events TO authenticated;
DROP POLICY IF EXISTS finance_control_events_read ON public.finance_control_events;
CREATE POLICY finance_control_events_read ON public.finance_control_events FOR SELECT TO authenticated
  USING (private.current_user_has_permission('finance','read'));

-- Canonical invoice payment entry: record the ledger event and maintain the invoice balance atomically.
CREATE OR REPLACE FUNCTION public.record_invoice_payment_transaction(
  p_invoice_id uuid, p_amount numeric, p_method text, p_reference text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_invoice public.invoices%ROWTYPE; v_new numeric; v_status text; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_method NOT IN ('cash','mpesa','bank_transfer','card','cheque','other') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.status='cancelled' THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
  v_new := v_invoice.amount_paid + p_amount;
  IF v_new > v_invoice.total_amount THEN RAISE EXCEPTION 'Payment exceeds invoice balance'; END IF;
  INSERT INTO public.payments(invoice_id,amount,method,reference,recorded_by,notes)
    VALUES(p_invoice_id,p_amount,p_method,nullif(trim(p_reference),''),v_user,p_notes) RETURNING id INTO v_id;
  v_status := CASE WHEN v_new >= v_invoice.total_amount AND v_invoice.total_amount > 0 THEN 'paid' ELSE 'partial' END;
  UPDATE public.invoices SET amount_paid=v_new,status=v_status,updated_at=now() WHERE id=p_invoice_id;
  INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,amount,note,created_by)
    VALUES(p_invoice_id,v_status,v_invoice.status,v_status,p_amount,COALESCE(NULLIF(trim(p_notes),''),'Payment recorded'),v_user);
  INSERT INTO public.finance_control_events(entity_type,entity_id,event_type,amount,from_status,to_status,note,created_by)
    VALUES('payment',v_id,'payment_recorded',p_amount,v_invoice.status,v_status,COALESCE(NULLIF(trim(p_reference),''),'Invoice payment'),v_user);
  RETURN jsonb_build_object('success',true,'payment_id',v_id,'invoice_id',p_invoice_id,'amount_paid',v_new,'balance_due',v_invoice.total_amount-v_new,'status',v_status);
END; $$;

-- Reconcile the complete finance chain for one order, or all orders when NULL.
CREATE OR REPLACE FUNCTION public.reconcile_finance_control_360(p_order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid; v_orders integer:=0; v_invoices integer:=0; v_invoice_fixes integer:=0; v_order_fixes integer:=0;
  v_invoice public.invoices%ROWTYPE; v_paid numeric; v_expected_status text; v_refunded numeric;
  v_order public.orders%ROWTYPE; v_order_paid numeric; v_order_refunded numeric; v_order_status text;
BEGIN
  v_user := private.require_staff_permission('finance','update');
  FOR v_invoice IN
    SELECT i.* FROM public.invoices i
    WHERE (p_order_id IS NULL OR i.order_id=p_order_id) FOR UPDATE
  LOOP
    v_invoices := v_invoices + 1;
    SELECT COALESCE(SUM(p.amount),0) INTO v_paid FROM public.payments p WHERE p.invoice_id=v_invoice.id;
    v_refunded := 0;
    -- Invoice payments are a collection ledger; refund state is maintained at order/payment-transaction level.
    v_expected_status := CASE
      WHEN v_invoice.status='cancelled' THEN 'cancelled'
      WHEN v_paid >= v_invoice.total_amount AND v_invoice.total_amount > 0 THEN 'paid'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < current_date AND v_paid < v_invoice.total_amount THEN 'overdue'
      WHEN v_paid > 0 THEN 'partial'
      ELSE v_invoice.status END;
    IF v_invoice.amount_paid IS DISTINCT FROM v_paid OR v_invoice.status IS DISTINCT FROM v_expected_status THEN
      UPDATE public.invoices SET amount_paid=v_paid,status=v_expected_status,updated_at=now() WHERE id=v_invoice.id;
      INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,amount,note,created_by)
        VALUES(v_invoice.id,v_expected_status,v_invoice.status,v_expected_status,v_paid,'Finance reconciliation corrected invoice ledger',v_user);
      v_invoice_fixes := v_invoice_fixes + 1;
      INSERT INTO public.finance_control_events(entity_type,entity_id,event_type,amount,from_status,to_status,note,created_by)
        VALUES('reconciliation',v_invoice.id,'invoice_reconciled',v_paid,v_invoice.status,v_expected_status,'Invoice payment ledger reconciled',v_user);
    END IF;
  END LOOP;

  FOR v_order IN
    SELECT o.* FROM public.orders o WHERE (p_order_id IS NULL OR o.id=p_order_id) FOR UPDATE
  LOOP
    v_orders := v_orders + 1;
    SELECT COALESCE(SUM(pt.amount),0) INTO v_order_paid FROM public.payment_transactions pt WHERE pt.order_id=v_order.id AND pt.status='successful';
    SELECT COALESCE(SUM(pr.amount),0) INTO v_order_refunded FROM public.payment_refunds pr WHERE pr.order_id=v_order.id AND pr.status='successful';
    v_order_status := CASE
      WHEN v_order_refunded >= v_order.total_amount AND v_order.total_amount > 0 THEN 'refunded'
      WHEN v_order_paid >= v_order.total_amount AND v_order.total_amount > 0 THEN 'paid'
      WHEN v_order_paid > 0 THEN 'partial'
      ELSE 'pending' END;
    IF v_order.payment_status IS DISTINCT FROM v_order_status THEN
      UPDATE public.orders SET payment_status=v_order_status,updated_at=now() WHERE id=v_order.id;
      v_order_fixes := v_order_fixes + 1;
      INSERT INTO public.finance_control_events(entity_type,entity_id,event_type,amount,from_status,to_status,note,created_by)
        VALUES('reconciliation',v_order.id,'order_payment_reconciled',v_order_paid,v_order.payment_status,v_order_status,'Order payment status reconciled',v_user);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success',true,'orders_checked',v_orders,'invoices_checked',v_invoices,'invoice_fixes',v_invoice_fixes,'order_fixes',v_order_fixes,'reconciled_by',v_user,'reconciled_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.get_finance_control_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_days integer; v_since timestamptz; v_result jsonb;
BEGIN
  v_user := private.require_staff_permission('reports','read');
  v_days := greatest(1,least(coalesce(p_days,30),365)); v_since := now()-make_interval(days=>v_days);
  SELECT jsonb_build_object(
    'days',v_days,
    'invoices',jsonb_build_object(
      'count',(SELECT count(*) FROM public.invoices WHERE created_at>=v_since),
      'invoiced',(SELECT COALESCE(sum(total_amount),0) FROM public.invoices WHERE created_at>=v_since AND status<>'cancelled'),
      'paid',(SELECT COALESCE(sum(amount_paid),0) FROM public.invoices WHERE created_at>=v_since AND status<>'cancelled'),
      'outstanding',(SELECT COALESCE(sum(GREATEST(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status NOT IN ('paid','cancelled')),
      'overdue_count',(SELECT count(*) FROM public.invoices WHERE status='overdue'),
      'overdue_value',(SELECT COALESCE(sum(GREATEST(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status='overdue')
    ),
    'payments',jsonb_build_object(
      'invoice_collections',(SELECT COALESCE(sum(amount),0) FROM public.payments WHERE paid_at>=v_since),
      'invoice_payment_count',(SELECT count(*) FROM public.payments WHERE paid_at>=v_since),
      'order_collections',(SELECT COALESCE(sum(amount),0) FROM public.payment_transactions WHERE created_at>=v_since AND status='successful'),
      'order_payment_count',(SELECT count(*) FROM public.payment_transactions WHERE created_at>=v_since AND status='successful'),
      'by_method',(SELECT COALESCE(jsonb_object_agg(method,amount),'{}'::jsonb) FROM (SELECT method,sum(amount) amount FROM public.payments WHERE paid_at>=v_since GROUP BY method)x)
    ),
    'refunds',jsonb_build_object(
      'count',(SELECT count(*) FROM public.payment_refunds WHERE created_at>=v_since),
      'successful',(SELECT COALESCE(sum(amount),0) FROM public.payment_refunds WHERE created_at>=v_since AND status='successful'),
      'pending',(SELECT COALESCE(sum(amount),0) FROM public.payment_refunds WHERE status IN ('pending','processing'))
    ),
    'reconciliation',jsonb_build_object(
      'invoice_mismatches',(SELECT count(*) FROM public.invoices i WHERE i.amount_paid IS DISTINCT FROM (SELECT COALESCE(sum(p.amount),0) FROM public.payments p WHERE p.invoice_id=i.id)),
      'order_mismatches',(SELECT count(*) FROM public.orders o WHERE o.payment_status IS DISTINCT FROM CASE WHEN (SELECT COALESCE(sum(pr.amount),0) FROM public.payment_refunds pr WHERE pr.order_id=o.id AND pr.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'refunded' WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'paid' WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') > 0 THEN 'partial' ELSE 'pending' END)
    ),
    'recent_events',(SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) FROM (SELECT id,entity_type,entity_id,event_type,amount,from_status,to_status,note,created_at FROM public.finance_control_events ORDER BY created_at DESC LIMIT 20)e)
  ) INTO v_result;
  RETURN v_result;
END; $$;

REVOKE EXECUTE ON FUNCTION public.reconcile_finance_control_360(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reconcile_finance_control_360(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_finance_control_360(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_finance_control_360(integer) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.finance_control_events FROM authenticated;

COMMENT ON FUNCTION public.reconcile_finance_control_360(uuid) IS 'Staff-only end-to-end reconciliation of invoice collections and order payment/refund status.';
COMMENT ON FUNCTION public.get_finance_control_360(integer) IS 'Staff reporting snapshot for finance collections, refunds and reconciliation mismatches.';
