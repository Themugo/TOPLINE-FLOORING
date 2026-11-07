-- Phase 10 — Finance & Billing lifecycle integrity hardening.
-- Keep invoices/payments as the canonical ledger; lifecycle status is derived from
-- the locked invoice and its recorded payment rows, never from client assertions.

CREATE OR REPLACE FUNCTION public.transition_invoice_lifecycle(
  p_invoice_id uuid,
  p_status text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user uuid;
  v_invoice public.invoices%ROWTYPE;
  v_paid numeric(12,2);
  v_balance numeric(12,2);
  v_allowed boolean := false;
  v_note text := NULLIF(trim(coalesce(p_note,'')), '');
BEGIN
  v_user := private.require_staff_permission('invoices','update');
  IF p_invoice_id IS NULL OR p_status IS NULL OR p_status NOT IN ('draft','sent','paid','partial','overdue','cancelled') THEN
    RAISE EXCEPTION 'Invalid invoice lifecycle request';
  END IF;
  IF v_note IS NOT NULL AND length(v_note)>1000 THEN RAISE EXCEPTION 'Invoice note is too long'; END IF;

  SELECT i.* INTO v_invoice FROM public.invoices i WHERE i.id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status=p_status THEN
    RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'status',p_status,'unchanged',true);
  END IF;

  -- Invoice payment rows are written under the same invoice row lock by the
  -- canonical payment RPC, so this sum is stable for the transition.
  SELECT COALESCE(sum(p.amount),0) INTO v_paid
  FROM public.payments p WHERE p.invoice_id=p_invoice_id;
  v_balance := greatest(v_invoice.total_amount-v_paid,0);

  v_allowed := CASE v_invoice.status
    WHEN 'draft' THEN p_status IN ('sent','cancelled')
    WHEN 'sent' THEN p_status IN ('partial','paid','overdue','cancelled')
    WHEN 'partial' THEN p_status IN ('paid','overdue','cancelled')
    WHEN 'overdue' THEN p_status IN ('partial','paid','cancelled')
    WHEN 'paid' THEN false
    WHEN 'cancelled' THEN false
    ELSE false END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid invoice transition from % to %',v_invoice.status,p_status; END IF;

  IF p_status='sent' AND NOT EXISTS(SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id=p_invoice_id) THEN
    RAISE EXCEPTION 'Invoice must have at least one line item before sending';
  END IF;
  IF p_status='partial' AND NOT (v_paid>0 AND v_paid<v_invoice.total_amount AND v_invoice.total_amount>0) THEN
    RAISE EXCEPTION 'Partial status requires a positive payment and an outstanding balance';
  END IF;
  IF p_status='paid' AND NOT (v_invoice.total_amount>0 AND v_paid>=v_invoice.total_amount) THEN
    RAISE EXCEPTION 'Invoice cannot be marked paid until its positive total is fully collected';
  END IF;
  IF p_status='overdue' AND NOT (v_invoice.due_date IS NOT NULL AND v_invoice.due_date<current_date AND v_balance>0) THEN
    RAISE EXCEPTION 'Only an unpaid invoice past its due date can be marked overdue';
  END IF;
  IF v_invoice.amount_paid IS DISTINCT FROM v_paid THEN
    RAISE EXCEPTION 'Invoice payment total is out of sync; reconcile finance before changing lifecycle status';
  END IF;

  UPDATE public.invoices SET status=p_status,updated_at=now() WHERE id=p_invoice_id;
  INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,amount,note,created_by)
  VALUES(p_invoice_id,p_status,v_invoice.status,p_status,v_paid,v_note,v_user);
  RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'status',p_status,'updated_by',v_user);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_invoice_lifecycle_statuses()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user uuid;
  v_count integer:=0;
  r record;
  v_paid numeric(12,2);
  v_status text;
BEGIN
  v_user := private.require_staff_permission('invoices','update');
  FOR r IN
    SELECT i.id,i.status,i.amount_paid,i.total_amount,i.due_date
    FROM public.invoices i
    WHERE i.status IN ('sent','partial','overdue')
    ORDER BY i.id
    FOR UPDATE
  LOOP
    SELECT COALESCE(sum(p.amount),0) INTO v_paid
    FROM public.payments p WHERE p.invoice_id=r.id;
    v_status := CASE
      WHEN r.total_amount>0 AND v_paid>=r.total_amount THEN 'paid'
      WHEN r.due_date IS NOT NULL AND r.due_date<current_date AND v_paid<r.total_amount THEN 'overdue'
      WHEN v_paid>0 AND v_paid<r.total_amount THEN 'partial'
      ELSE 'sent' END;
    IF r.amount_paid IS DISTINCT FROM v_paid OR r.status IS DISTINCT FROM v_status THEN
      UPDATE public.invoices SET amount_paid=v_paid,status=v_status,updated_at=now() WHERE id=r.id;
      INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,amount,note,created_by)
      VALUES(r.id,v_status,r.status,v_status,v_paid,'Automatic lifecycle refresh from payment ledger',v_user);
      v_count:=v_count+1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success',true,'updated_count',v_count,'updated_by',v_user);
END;
$function$;

-- The finance workspace consumes the reporting permission used by the current
-- Finance Control snapshot. Keep its read contract consistent with that route.
CREATE OR REPLACE FUNCTION public.get_finance_operations_360(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user uuid;
  v_days integer;
  v_since timestamptz;
  v_result jsonb;
BEGIN
  v_user:=private.require_staff_permission('reports','select');
  v_days:=greatest(1,least(coalesce(p_days,30),365));
  v_since:=now()-make_interval(days=>v_days);
  SELECT jsonb_build_object(
    'days',v_days,
    'invoice_count',(SELECT count(*) FROM public.invoices WHERE created_at>=v_since),
    'invoiced',(SELECT coalesce(sum(total_amount),0) FROM public.invoices WHERE created_at>=v_since AND status<>'cancelled'),
    'collected',(SELECT coalesce(sum(amount),0) FROM public.payments WHERE paid_at>=v_since),
    'outstanding',(SELECT coalesce(sum(greatest(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status NOT IN ('paid','cancelled')),
    'overdue_count',(SELECT count(*) FROM public.invoices WHERE status='overdue'),
    'overdue_value',(SELECT coalesce(sum(greatest(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status='overdue'),
    'draft_count',(SELECT count(*) FROM public.invoices WHERE status='draft'),
    'sent_count',(SELECT count(*) FROM public.invoices WHERE status='sent'),
    'partial_count',(SELECT count(*) FROM public.invoices WHERE status='partial'),
    'paid_count',(SELECT count(*) FROM public.invoices WHERE status='paid'),
    'cancelled_count',(SELECT count(*) FROM public.invoices WHERE status='cancelled'),
    'payment_count',(SELECT count(*) FROM public.payments WHERE paid_at>=v_since),
    'payment_by_method',(SELECT coalesce(jsonb_object_agg(method,amount),'{}'::jsonb) FROM (SELECT method,sum(amount) amount FROM public.payments WHERE paid_at>=v_since GROUP BY method)x),
    'aging',(SELECT jsonb_build_object(
      'current',coalesce(sum(CASE WHEN due_date IS NULL OR due_date>=current_date THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0),
      '1_30',coalesce(sum(CASE WHEN due_date<current_date AND due_date>=current_date-30 THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0),
      '31_60',coalesce(sum(CASE WHEN due_date<current_date-30 AND due_date>=current_date-60 THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0),
      '61_plus',coalesce(sum(CASE WHEN due_date<current_date-60 THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0)
    ) FROM public.invoices WHERE status NOT IN ('paid','cancelled'))
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.transition_invoice_lifecycle(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.refresh_invoice_lifecycle_statuses() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_finance_operations_360(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_invoice_lifecycle(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_invoice_lifecycle_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_operations_360(integer) TO authenticated;

COMMENT ON FUNCTION public.transition_invoice_lifecycle(uuid,text,text) IS 'Staff-only invoice lifecycle transitions validated against canonical invoice payment rows.';
COMMENT ON FUNCTION public.refresh_invoice_lifecycle_statuses() IS 'Staff-only invoice lifecycle refresh derived from canonical payment rows.';
COMMENT ON FUNCTION public.get_finance_operations_360(integer) IS 'Staff reporting snapshot for invoice billing, collections and receivables aging.';
