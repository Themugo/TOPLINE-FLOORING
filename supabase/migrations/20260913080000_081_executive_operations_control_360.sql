-- Operation 8 — Executive Operations & Control Centre 360
CREATE TABLE IF NOT EXISTS public.executive_operations_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executive_operations_events_created_at ON public.executive_operations_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executive_operations_events_type ON public.executive_operations_events(event_type, created_at DESC);
ALTER TABLE public.executive_operations_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.executive_operations_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_executive_operations_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('reports','read'); v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'checked_at', now(),
    'active_projects', (SELECT count(*) FROM public.projects WHERE status NOT IN ('completed','cancelled')),
    'overdue_deliveries', (SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled') AND scheduled_date < current_date),
    'unresolved_service_cases', (SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected')),
    'overdue_service_cases', (SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected') AND sla_due_at < now()),
    'low_stock', (SELECT count(*) FROM public.products WHERE is_active=true AND stock_quantity <= low_stock_threshold),
    'finance_invoice_mismatches', (SELECT count(*) FROM public.invoices i WHERE i.amount_paid IS DISTINCT FROM (SELECT COALESCE(sum(p.amount),0) FROM public.payments p WHERE p.invoice_id=i.id)),
    'finance_order_mismatches', (SELECT count(*) FROM public.orders o WHERE o.payment_status IS DISTINCT FROM CASE WHEN (SELECT COALESCE(sum(pr.amount),0) FROM public.payment_refunds pr WHERE pr.order_id=o.id AND pr.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'refunded' WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'paid' WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') > 0 THEN 'partial' ELSE 'pending' END),
    'communication_failures', (SELECT count(*) FROM public.communication_outbox WHERE status='failed' OR delivery_status IN ('failed','rejected','expired')),
    'renewals_overdue', (SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on < current_date),
    'maintenance_overdue', (SELECT count(*) FROM public.maintenance_plans WHERE status='active' AND next_due_on < current_date)
  ) INTO v_result;
  INSERT INTO public.executive_operations_events(event_type, metadata, created_by)
  VALUES ('reconciliation', v_result, v_user);
  RETURN v_result || jsonb_build_object('reconciled_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.get_executive_operations_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('reports','read'); v_days integer:=greatest(1,least(coalesce(p_days,30),365)); v_since timestamptz; v_metrics jsonb; v_exceptions jsonb;
BEGIN
  v_since := now()-make_interval(days=>v_days);
  SELECT jsonb_build_object(
    'customers',(SELECT count(*) FROM public.customers),
    'new_customers',(SELECT count(*) FROM public.customers WHERE created_at>=v_since),
    'open_leads',(SELECT count(*) FROM public.leads WHERE status NOT IN ('converted','lost','closed')),
    'quotes_open',(SELECT count(*) FROM public.quotations WHERE status IN ('draft','sent','negotiating')),
    'orders_active',(SELECT count(*) FROM public.orders WHERE status NOT IN ('completed','cancelled')),
    'orders_revenue',(SELECT COALESCE(sum(total_amount),0) FROM public.orders WHERE created_at>=v_since AND status<>'cancelled'),
    'projects_active',(SELECT count(*) FROM public.projects WHERE status NOT IN ('completed','cancelled')),
    'projects_overdue',(SELECT count(*) FROM public.projects WHERE status NOT IN ('completed','cancelled') AND COALESCE(end_date,expected_completion_date) < current_date),
    'low_stock',(SELECT count(*) FROM public.products WHERE is_active=true AND stock_quantity<=low_stock_threshold),
    'open_purchase_orders',(SELECT count(*) FROM public.purchase_orders WHERE status NOT IN ('received','cancelled')),
    'pending_deliveries',(SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled')),
    'overdue_deliveries',(SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled') AND scheduled_date < current_date),
    'unresolved_service_cases',(SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected')),
    'overdue_service_cases',(SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected') AND sla_due_at < now()),
    'maintenance_overdue',(SELECT count(*) FROM public.maintenance_plans WHERE status='active' AND next_due_on<current_date),
    'renewals_due_14_days',(SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on BETWEEN current_date AND current_date+14),
    'renewals_overdue',(SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on<current_date),
    'invoice_outstanding',(SELECT COALESCE(sum(GREATEST(total_amount-amount_paid,0)),0) FROM public.invoices WHERE status NOT IN ('paid','cancelled')),
    'invoice_overdue',(SELECT count(*) FROM public.invoices WHERE status='overdue'),
    'invoice_mismatches',(SELECT count(*) FROM public.invoices i WHERE i.amount_paid IS DISTINCT FROM (SELECT COALESCE(sum(p.amount),0) FROM public.payments p WHERE p.invoice_id=i.id)),
    'order_payment_mismatches',(SELECT count(*) FROM public.orders o WHERE o.payment_status IS DISTINCT FROM CASE WHEN (SELECT COALESCE(sum(pr.amount),0) FROM public.payment_refunds pr WHERE pr.order_id=o.id AND pr.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'refunded' WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'paid' WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') > 0 THEN 'partial' ELSE 'pending' END),
    'communication_failures',(SELECT count(*) FROM public.communication_outbox WHERE status='failed' OR delivery_status IN ('failed','rejected','expired')),
    'unmatched_inbound',(SELECT count(*) FROM public.communication_inbound WHERE customer_id IS NULL)
  ) INTO v_metrics;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.priority DESC,x.count DESC),'[]'::jsonb) INTO v_exceptions
  FROM (
    SELECT 'critical' priority,'Finance' domain,'Invoice reconciliation mismatches' label,(v_metrics->>'invoice_mismatches')::integer count WHERE (v_metrics->>'invoice_mismatches')::integer>0
    UNION ALL SELECT 'critical','Finance','Order payment mismatches',(v_metrics->>'order_payment_mismatches')::integer WHERE (v_metrics->>'order_payment_mismatches')::integer>0
    UNION ALL SELECT 'high','Delivery','Overdue deliveries',(v_metrics->>'overdue_deliveries')::integer WHERE (v_metrics->>'overdue_deliveries')::integer>0
    UNION ALL SELECT 'high','Customer Service','Overdue SLA cases',(v_metrics->>'overdue_service_cases')::integer WHERE (v_metrics->>'overdue_service_cases')::integer>0
    UNION ALL SELECT 'high','Supply Chain','Low-stock products',(v_metrics->>'low_stock')::integer WHERE (v_metrics->>'low_stock')::integer>0
    UNION ALL SELECT 'high','Customer Retention','Overdue renewals',(v_metrics->>'renewals_overdue')::integer WHERE (v_metrics->>'renewals_overdue')::integer>0
    UNION ALL SELECT 'medium','Customer Retention','Overdue maintenance',(v_metrics->>'maintenance_overdue')::integer WHERE (v_metrics->>'maintenance_overdue')::integer>0
    UNION ALL SELECT 'medium','Communications','Delivery failures',(v_metrics->>'communication_failures')::integer WHERE (v_metrics->>'communication_failures')::integer>0
    UNION ALL SELECT 'medium','Communications','Unmatched inbound messages',(v_metrics->>'unmatched_inbound')::integer WHERE (v_metrics->>'unmatched_inbound')::integer>0
  ) x;

  RETURN jsonb_build_object('days',v_days,'generated_at',now(),'viewer',v_user,'metrics',v_metrics,'exceptions',v_exceptions,
    'priorities',jsonb_build_object('critical',(SELECT count(*) FROM jsonb_array_elements(v_exceptions) e WHERE e->>'priority'='critical'),'high',(SELECT count(*) FROM jsonb_array_elements(v_exceptions) e WHERE e->>'priority'='high'),'medium',(SELECT count(*) FROM jsonb_array_elements(v_exceptions) e WHERE e->>'priority'='medium')));
END; $$;

REVOKE ALL ON FUNCTION public.reconcile_executive_operations_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_executive_operations_360() TO authenticated;
REVOKE ALL ON FUNCTION public.get_executive_operations_360(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_executive_operations_360(integer) TO authenticated;
COMMENT ON FUNCTION public.get_executive_operations_360(integer) IS 'Staff-only executive control-plane snapshot aggregating canonical commercial, project, supply chain, finance, delivery, service, retention and communications signals.';
