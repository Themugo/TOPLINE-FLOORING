-- Phase 10: Finance & Billing Operations 360
-- Invoice lifecycle, aging, audit trail and finance command-center snapshot.
CREATE TABLE IF NOT EXISTS public.invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','item_added','item_removed','sent','paid','partial','overdue','cancelled','note')),
  from_status text,
  to_status text,
  amount numeric(12,2),
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoice_events_invoice_idx ON public.invoice_events(invoice_id, created_at DESC);
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoice_events FROM anon, authenticated;
GRANT SELECT ON public.invoice_events TO authenticated;
DROP POLICY IF EXISTS invoice_events_read ON public.invoice_events;
CREATE POLICY invoice_events_read ON public.invoice_events FOR SELECT TO authenticated USING(private.current_user_has_permission('invoices','read'));

CREATE OR REPLACE FUNCTION public.transition_invoice_lifecycle(p_invoice_id uuid,p_status text,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_invoice public.invoices%ROWTYPE; v_new text; v_allowed boolean := false;
BEGIN
 v_user:=private.require_staff_permission('invoices','update');
 IF p_status NOT IN ('draft','sent','paid','partial','overdue','cancelled') THEN RAISE EXCEPTION 'Invalid invoice status'; END IF;
 SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
 IF v_invoice.status=p_status THEN RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'status',p_status,'unchanged',true); END IF;
 v_allowed := CASE v_invoice.status
   WHEN 'draft' THEN p_status IN ('sent','cancelled')
   WHEN 'sent' THEN p_status IN ('partial','paid','overdue','cancelled')
   WHEN 'partial' THEN p_status IN ('paid','overdue','cancelled')
   WHEN 'overdue' THEN p_status IN ('partial','paid','cancelled')
   WHEN 'paid' THEN false
   WHEN 'cancelled' THEN false
   ELSE false END;
 IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid invoice transition from % to %',v_invoice.status,p_status; END IF;
 IF p_status='sent' AND NOT EXISTS(SELECT 1 FROM public.invoice_items WHERE invoice_id=p_invoice_id) THEN RAISE EXCEPTION 'Invoice must have at least one line item before sending'; END IF;
 IF p_status='paid' AND v_invoice.amount_paid < v_invoice.total_amount THEN RAISE EXCEPTION 'Invoice cannot be marked paid while a balance remains'; END IF;
 IF p_status='overdue' AND (v_invoice.due_date IS NULL OR v_invoice.due_date >= current_date) THEN RAISE EXCEPTION 'Invoice is not overdue'; END IF;
 UPDATE public.invoices SET status=p_status,updated_at=now() WHERE id=p_invoice_id;
 INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,note,created_by) VALUES(p_invoice_id,p_status,v_invoice.status,p_status,NULLIF(trim(p_note),''),v_user);
 RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'status',p_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_invoice_lifecycle_statuses()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_count integer:=0; r record; v_status text;
BEGIN
 v_user:=private.require_staff_permission('invoices','update');
 FOR r IN SELECT id,status,amount_paid,total_amount,due_date FROM public.invoices WHERE status IN ('sent','partial','overdue') FOR UPDATE LOOP
   v_status:=CASE WHEN r.amount_paid >= r.total_amount AND r.total_amount > 0 THEN 'paid'
                  WHEN r.due_date IS NOT NULL AND r.due_date < current_date THEN 'overdue'
                  ELSE r.status END;
   IF v_status<>r.status THEN
     UPDATE public.invoices SET status=v_status,updated_at=now() WHERE id=r.id;
     INSERT INTO public.invoice_events(invoice_id,event_type,from_status,to_status,note,created_by) VALUES(r.id,v_status,r.status,v_status,'Automatic lifecycle refresh',v_user);
     v_count:=v_count+1;
   END IF;
 END LOOP;
 RETURN jsonb_build_object('success',true,'updated_count',v_count,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.get_finance_operations_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_days integer; v_since timestamptz; v_result jsonb;
BEGIN
 v_user:=private.require_staff_permission('reports','read');
 v_days:=greatest(1,least(coalesce(p_days,30),365)); v_since:=now()-make_interval(days=>v_days);
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
  'payment_by_method',(SELECT coalesce(jsonb_object_agg(method,amount), '{}'::jsonb) FROM (SELECT method,sum(amount) amount FROM public.payments WHERE paid_at>=v_since GROUP BY method)x),
  'aging',(SELECT jsonb_build_object(
      'current',coalesce(sum(CASE WHEN due_date IS NULL OR due_date>=current_date THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0),
      '1_30',coalesce(sum(CASE WHEN due_date<current_date AND due_date>=current_date-30 THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0),
      '31_60',coalesce(sum(CASE WHEN due_date<current_date-30 AND due_date>=current_date-60 THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0),
      '61_plus',coalesce(sum(CASE WHEN due_date<current_date-60 THEN greatest(total_amount-amount_paid,0) ELSE 0 END),0)
    ) FROM public.invoices WHERE status NOT IN ('paid','cancelled'))
 ) INTO v_result;
 RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION public.transition_invoice_lifecycle(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_invoice_lifecycle_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_operations_360(integer) TO authenticated;
