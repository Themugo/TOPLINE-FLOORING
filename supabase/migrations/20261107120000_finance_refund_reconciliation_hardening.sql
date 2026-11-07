-- Phase 6 — finance reconciliation and refund concurrency hardening.
-- Preserve existing RPC contracts; serialize all order-scoped refund writes in order -> refund order.

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
  v_order_id uuid;
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_payment_status text;
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

  -- Read the parent key without locking, then always lock parent before child.
  -- This matches create_order_refund_request and prevents order/refund deadlocks.
  SELECT order_id INTO v_order_id FROM public.payment_refunds WHERE id=p_refund_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  IF v_order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Refund order no longer exists'; END IF;
  END IF;

  SELECT * INTO v_refund FROM public.payment_refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  IF v_refund.order_id IS DISTINCT FROM v_order_id THEN
    RAISE EXCEPTION 'Refund parent changed during completion; retry the operation';
  END IF;
  IF v_refund.status IN ('successful','failed','reversed') THEN
    IF v_refund.status='successful' AND
       (v_provider_refund_id IS DISTINCT FROM v_refund.provider_refund_id OR v_provider IS DISTINCT FROM v_refund.provider) THEN
      RAISE EXCEPTION 'Completed refund cannot be replayed with different provider identity';
    END IF;
    RETURN jsonb_build_object('success',true,'refund_id',v_refund.id,'status',v_refund.status,'idempotent_replay',true);
  END IF;
  IF v_refund.status NOT IN ('pending','processing') THEN
    RAISE EXCEPTION 'Refund is not in a completable state';
  END IF;

  -- The unique provider/refund index remains the final duplicate-provider guard.
  UPDATE public.payment_refunds
  SET status=CASE WHEN p_success THEN 'successful' ELSE 'failed' END,
      provider=v_provider, provider_refund_id=v_provider_refund_id,
      processed_at=CASE WHEN p_success THEN now() ELSE NULL END,
      reason=CASE WHEN p_notes IS NULL THEN reason ELSE left(concat_ws(' | ',NULLIF(reason,''),p_notes),1000) END,
      updated_at=now()
  WHERE id=p_refund_id;

  INSERT INTO public.finance_control_events(entity_type,entity_id,event_type,amount,from_status,to_status,note,created_by)
  VALUES('refund',p_refund_id,CASE WHEN p_success THEN 'refund_succeeded' ELSE 'refund_failed' END,
         v_refund.amount,v_refund.status,CASE WHEN p_success THEN 'successful' ELSE 'failed' END,
         COALESCE(NULLIF(p_notes,''), 'Refund provider outcome recorded'),v_user);

  IF p_success AND v_order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions
      WHERE order_id=v_order_id AND status='successful';
    SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds
      WHERE order_id=v_order_id AND status='successful';
    IF v_refunded>v_paid THEN RAISE EXCEPTION 'Refunds exceed successful payments'; END IF;
    v_payment_status := CASE
      WHEN v_paid>0 AND v_refunded>=v_paid THEN 'refunded'
      WHEN v_paid>=v_order.total_amount AND v_order.total_amount>0 THEN 'paid'
      WHEN v_paid>0 THEN 'partial'
      ELSE 'pending'
    END;
    UPDATE public.orders SET payment_status=v_payment_status,updated_at=now() WHERE id=v_order_id;
  END IF;

  RETURN jsonb_build_object('success',true,'refund_id',p_refund_id,
    'status',CASE WHEN p_success THEN 'successful' ELSE 'failed' END,'updated_by',v_user);
END;
$function$;

-- Reconciliation must derive refund state from the amount actually paid, not the
-- full order total. A fully refunded partial payment is still fully refunded.
CREATE OR REPLACE FUNCTION public.reconcile_finance_control_360(p_order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user uuid; v_orders integer:=0; v_invoices integer:=0; v_invoice_fixes integer:=0; v_order_fixes integer:=0;
  v_invoice public.invoices%ROWTYPE; v_paid numeric; v_expected_status text;
  v_order public.orders%ROWTYPE; v_order_paid numeric; v_order_refunded numeric; v_order_status text;
BEGIN
  v_user := private.require_staff_permission('finance','update');
  FOR v_invoice IN SELECT i.* FROM public.invoices i
    WHERE (p_order_id IS NULL OR i.order_id=p_order_id) FOR UPDATE
  LOOP
    v_invoices:=v_invoices+1;
    SELECT COALESCE(SUM(p.amount),0) INTO v_paid FROM public.payments p WHERE p.invoice_id=v_invoice.id;
    v_expected_status:=CASE
      WHEN v_invoice.status='cancelled' THEN 'cancelled'
      WHEN v_paid>=v_invoice.total_amount AND v_invoice.total_amount>0 THEN 'paid'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date<current_date AND v_paid<v_invoice.total_amount THEN 'overdue'
      WHEN v_paid>0 THEN 'partial'
      ELSE v_invoice.status END;
    IF v_invoice.amount_paid IS DISTINCT FROM v_paid OR v_invoice.status IS DISTINCT FROM v_expected_status THEN
      UPDATE public.invoices SET amount_paid=v_paid,status=v_expected_status,updated_at=now() WHERE id=v_invoice.id;
      INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,amount,note,created_by)
      VALUES(v_invoice.id,v_expected_status,v_invoice.status,v_expected_status,v_paid,'Finance reconciliation corrected invoice ledger',v_user);
      v_invoice_fixes:=v_invoice_fixes+1;
      INSERT INTO public.finance_control_events(entity_type,entity_id,event_type,amount,from_status,to_status,note,created_by)
      VALUES('reconciliation',v_invoice.id,'invoice_reconciled',v_paid,v_invoice.status,v_expected_status,'Invoice payment ledger reconciled',v_user);
    END IF;
  END LOOP;

  FOR v_order IN SELECT o.* FROM public.orders o WHERE (p_order_id IS NULL OR o.id=p_order_id) FOR UPDATE
  LOOP
    v_orders:=v_orders+1;
    SELECT COALESCE(SUM(pt.amount),0) INTO v_order_paid FROM public.payment_transactions pt
      WHERE pt.order_id=v_order.id AND pt.status='successful';
    SELECT COALESCE(SUM(pr.amount),0) INTO v_order_refunded FROM public.payment_refunds pr
      WHERE pr.order_id=v_order.id AND pr.status='successful';
    IF v_order_refunded>v_order_paid THEN
      RAISE EXCEPTION 'Refund ledger exceeds successful payments for order %',v_order.id;
    END IF;
    v_order_status:=CASE
      WHEN v_order_paid>0 AND v_order_refunded>=v_order_paid THEN 'refunded'
      WHEN v_order_paid>=v_order.total_amount AND v_order.total_amount>0 THEN 'paid'
      WHEN v_order_paid>0 THEN 'partial'
      ELSE 'pending' END;
    IF v_order.payment_status IS DISTINCT FROM v_order_status THEN
      UPDATE public.orders SET payment_status=v_order_status,updated_at=now() WHERE id=v_order.id;
      v_order_fixes:=v_order_fixes+1;
      INSERT INTO public.finance_control_events(entity_type,entity_id,event_type,amount,from_status,to_status,note,created_by)
      VALUES('reconciliation',v_order.id,'order_payment_reconciled',v_order_paid,v_order.payment_status,v_order_status,'Order payment/refund ledger reconciled',v_user);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success',true,'orders_checked',v_orders,'invoices_checked',v_invoices,
    'invoice_fixes',v_invoice_fixes,'order_fixes',v_order_fixes,'reconciled_by',v_user,'reconciled_at',now());
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.reconcile_finance_control_360(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_finance_control_360(uuid) TO authenticated;
COMMENT ON FUNCTION public.complete_order_refund(uuid,boolean,text,text,text) IS 'Finance-authorized, order-first locked refund completion with idempotent provider identity and immutable outcome event.';
COMMENT ON FUNCTION public.reconcile_finance_control_360(uuid) IS 'Finance reconciliation derives order payment state from successful payment and refund ledger totals; fully refunded partial payments remain refunded.';
