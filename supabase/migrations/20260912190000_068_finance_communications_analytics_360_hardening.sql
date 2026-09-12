-- Phases 21–23: Finance, Communications & Analytics 360 hardening
-- Close remaining browser-write paths, enforce invoice lifecycle integrity,
-- and expose a single protected analytics snapshot for operational reporting.

CREATE OR REPLACE FUNCTION public.remove_invoice_item_transaction(p_invoice_id uuid, p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_sub numeric; v_tax numeric; v_total numeric; v_taxrate numeric; v_deleted integer;
BEGIN
  v_user := private.require_staff_permission('invoices','update');
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id=p_invoice_id AND status NOT IN ('paid','cancelled')) THEN
    RAISE EXCEPTION 'Invoice unavailable for editing';
  END IF;
  DELETE FROM public.invoice_items WHERE id=p_item_id AND invoice_id=p_invoice_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted=0 THEN RAISE EXCEPTION 'Invoice item not found'; END IF;
  SELECT COALESCE(sum(line_total),0), tax_rate INTO v_sub,v_taxrate
  FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id
  WHERE ii.invoice_id=p_invoice_id GROUP BY i.tax_rate;
  v_sub := COALESCE(v_sub,0); v_taxrate := COALESCE(v_taxrate,0);
  v_tax := round(v_sub*v_taxrate/100,2); v_total := v_sub+v_tax;
  UPDATE public.invoices SET subtotal=v_sub,tax_amount=v_tax,total_amount=v_total,updated_at=now() WHERE id=p_invoice_id;
  INSERT INTO public.invoice_events(invoice_id,event_type,amount,note,created_by)
  VALUES(p_invoice_id,'item_removed',v_total,'Invoice item removed',v_user);
  RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'subtotal',v_sub,'tax_amount',v_tax,'total_amount',v_total,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.delete_draft_invoice_transaction(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_status text;
BEGIN
  v_user := private.require_staff_permission('invoices','delete');
  SELECT status INTO v_status FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'Only draft invoices can be deleted'; END IF;
  DELETE FROM public.invoices WHERE id=p_invoice_id;
  RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'deleted_by',v_user);
END; $$;

-- Replace the legacy status RPC with the hardened lifecycle implementation so
-- there is one canonical transition path for invoice status changes.
REVOKE EXECUTE ON FUNCTION public.create_invoice_transaction(uuid,uuid,uuid,text,text,text,text,numeric,date,text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_invoice_item_transaction(uuid,text,numeric,numeric) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_invoice_payment_transaction(uuid,numeric,text,text,text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_invoice_status_transaction(uuid,text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_customer_communication(uuid,text,text,text,text,uuid,uuid,uuid,text,text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_business_analytics(integer) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_invoice_transaction(uuid,uuid,uuid,text,text,text,text,numeric,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_invoice_item_transaction(uuid,text,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment_transaction(uuid,numeric,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_customer_communication(uuid,text,text,text,text,uuid,uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_analytics(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_invoice_status_transaction(uuid,text) FROM authenticated;

-- Browser clients may read invoices through existing RLS, but mutations are
-- now exclusively mediated by transactional RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.invoice_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.customer_communications FROM authenticated;
GRANT SELECT ON public.customer_communications TO authenticated;

CREATE OR REPLACE FUNCTION public.get_finance_communications_analytics_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_days integer; v_since timestamptz; v_result jsonb;
BEGIN
  v_user := private.require_staff_permission('reports','read');
  v_days := greatest(1,least(coalesce(p_days,30),365));
  v_since := now()-make_interval(days=>v_days);
  SELECT jsonb_build_object(
    'days',v_days,
    'finance',jsonb_build_object(
      'invoice_count',(SELECT count(*) FROM public.invoices WHERE created_at>=v_since),
      'invoiced',(SELECT coalesce(sum(total_amount),0) FROM public.invoices WHERE created_at>=v_since AND status<>'cancelled'),
      'collected',(SELECT coalesce(sum(amount),0) FROM public.payments WHERE paid_at>=v_since),
      'outstanding',(SELECT coalesce(sum(greatest(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status NOT IN ('paid','cancelled')),
      'overdue_count',(SELECT count(*) FROM public.invoices WHERE status='overdue'),
      'overdue_value',(SELECT coalesce(sum(greatest(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status='overdue'),
      'payment_count',(SELECT count(*) FROM public.payments WHERE paid_at>=v_since)
    ),
    'commerce',jsonb_build_object(
      'orders',(SELECT count(*) FROM public.orders WHERE created_at>=v_since),
      'sales',(SELECT coalesce(sum(total_amount),0) FROM public.orders WHERE created_at>=v_since AND status<>'cancelled'),
      'cancelled_orders',(SELECT count(*) FROM public.orders WHERE created_at>=v_since AND status='cancelled')
    ),
    'communications',jsonb_build_object(
      'outbound',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND direction='outbound'),
      'inbound',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND direction='inbound'),
      'email',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND channel='email'),
      'sms',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND channel='sms'),
      'whatsapp',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND channel='whatsapp'),
      'phone',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND channel='phone'),
      'notes',(SELECT count(*) FROM public.customer_communications WHERE created_at>=v_since AND channel='note')
    ),
    'web',jsonb_build_object(
      'visits',(SELECT count(*) FROM public.page_visits WHERE visited_at>=v_since),
      'unique_paths',(SELECT count(DISTINCT page_path) FROM public.page_visits WHERE visited_at>=v_since),
      'top_pages',(SELECT coalesce(jsonb_agg(x ORDER BY x.visits DESC),'[]'::jsonb) FROM (SELECT page_path,count(*) visits FROM public.page_visits WHERE visited_at>=v_since GROUP BY page_path ORDER BY count(*) DESC LIMIT 10)x)
    )
  ) INTO v_result;
  RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION public.remove_invoice_item_transaction(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_draft_invoice_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_communications_analytics_360(integer) TO authenticated;

COMMENT ON FUNCTION public.get_finance_communications_analytics_360(integer) IS 'Staff-only 360 operating snapshot for finance, commerce, communications and web analytics.';
