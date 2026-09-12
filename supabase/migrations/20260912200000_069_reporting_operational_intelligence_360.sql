-- Phases 24-26: Reporting & Operational Intelligence 360.
-- Consolidates staff reporting into one permission-gated server-side read surface.

CREATE OR REPLACE FUNCTION public.get_reporting_operational_intelligence_360(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE
  v_days integer := greatest(1, least(coalesce(p_days,30),365));
  v_start timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days,30),365)));
  v_prev_start timestamptz := v_start - make_interval(days => greatest(1, least(coalesce(p_days,30),365)));
  v_revenue numeric := 0;
  v_previous_revenue numeric := 0;
  v_orders integer := 0;
  v_quotations integer := 0;
  v_new_customers integer := 0;
  v_pending_orders integer := 0;
  v_low_stock integer := 0;
  v_inventory_value numeric := 0;
  v_outstanding numeric := 0;
  v_converted_quotes integer := 0;
  v_open_cases integer := 0;
  v_open_inbound integer := 0;
  v_email_delivered integer := 0;
  v_whatsapp_delivered integer := 0;
  v_sms_delivered integer := 0;
  v_top_products jsonb := '[]'::jsonb;
  v_order_statuses jsonb := '[]'::jsonb;
  v_quote_statuses jsonb := '[]'::jsonb;
  v_revenue_trend jsonb := '[]'::jsonb;
  v_recent_activity jsonb := '[]'::jsonb;
BEGIN
  PERFORM private.require_staff_permission('reports','read');

  SELECT COALESCE(sum(o.total_amount),0), count(*)::integer
    INTO v_revenue, v_orders
  FROM public.orders o
  WHERE o.created_at >= v_start;

  SELECT COALESCE(sum(o.total_amount),0)
    INTO v_previous_revenue
  FROM public.orders o
  WHERE o.created_at >= v_prev_start AND o.created_at < v_start;

  SELECT count(*)::integer INTO v_quotations
  FROM public.quotations q WHERE q.created_at >= v_start;

  SELECT count(*)::integer INTO v_converted_quotes
  FROM public.quotations q
  WHERE q.created_at >= v_start AND q.status IN ('accepted','converted','won');

  SELECT count(*)::integer INTO v_new_customers
  FROM public.customers c WHERE c.created_at >= v_start;

  SELECT count(*)::integer INTO v_pending_orders
  FROM public.orders o WHERE o.status = 'pending';

  SELECT count(*)::integer, COALESCE(sum((p.stock_quantity * p.price)),0)
    INTO v_low_stock, v_inventory_value
  FROM public.products p
  WHERE p.is_active = true;

  SELECT count(*)::integer INTO v_open_cases
  FROM public.service_cases s
  WHERE s.status NOT IN ('resolved','closed','rejected');

  SELECT count(*)::integer INTO v_open_inbound
  FROM public.communication_inbound i
  WHERE i.processed_at IS NULL;

  SELECT count(*)::integer FILTER (WHERE o.channel='email' AND coalesce(o.last_provider_event,'') IN ('delivered','opened','read')),
         count(*)::integer FILTER (WHERE o.channel='whatsapp' AND coalesce(o.last_provider_event,'') IN ('delivered','read')),
         count(*)::integer FILTER (WHERE o.channel='sms' AND coalesce(o.last_provider_event,'') IN ('delivered','success'))
    INTO v_email_delivered, v_whatsapp_delivered, v_sms_delivered
  FROM public.communication_outbox o
  WHERE o.created_at >= v_start;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('status',x.status,'count',x.count) ORDER BY x.status),'[]'::jsonb)
    INTO v_order_statuses
  FROM (SELECT status,count(*)::integer FROM public.orders WHERE created_at >= v_start GROUP BY status) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('status',x.status,'count',x.count) ORDER BY x.status),'[]'::jsonb)
    INTO v_quote_statuses
  FROM (SELECT status,count(*)::integer FROM public.quotations WHERE created_at >= v_start GROUP BY status) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name',x.product_name,'quantity',x.quantity,'revenue',x.revenue) ORDER BY x.revenue DESC),'[]'::jsonb)
    INTO v_top_products
  FROM (
    SELECT oi.product_name, sum(oi.quantity)::integer AS quantity, sum(oi.quantity * oi.unit_price) AS revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id=oi.order_id
    WHERE o.created_at >= v_start
    GROUP BY oi.product_name
    ORDER BY sum(oi.quantity * oi.unit_price) DESC
    LIMIT 5
  ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date',x.day,'revenue',x.revenue) ORDER BY x.day),'[]'::jsonb)
    INTO v_revenue_trend
  FROM (
    SELECT to_char(date_trunc('day',o.created_at),'YYYY-MM-DD') AS day, sum(o.total_amount) AS revenue
    FROM public.orders o WHERE o.created_at >= v_start GROUP BY date_trunc('day',o.created_at)
  ) x;

  SELECT COALESCE(sum(i.total_amount - i.amount_paid),0)
    INTO v_outstanding
  FROM public.invoices i
  WHERE i.status NOT IN ('paid','cancelled');

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,'entity_type',a.entity_type,'details',a.details,'created_at',a.created_at) ORDER BY a.created_at DESC),'[]'::jsonb)
    INTO v_recent_activity
  FROM (SELECT id,action,entity_type,details,created_at FROM public.activity_logs ORDER BY created_at DESC LIMIT 10) a;

  RETURN jsonb_build_object(
    'days', v_days,
    'period_start', v_start,
    'metrics', jsonb_build_object(
      'total_revenue', v_revenue,
      'previous_revenue', v_previous_revenue,
      'total_orders', v_orders,
      'total_quotations', v_quotations,
      'new_customers', v_new_customers,
      'pending_orders', v_pending_orders,
      'low_stock_count', v_low_stock,
      'inventory_valuation', v_inventory_value,
      'outstanding_balance', v_outstanding,
      'conversion_rate', CASE WHEN v_quotations > 0 THEN round((v_converted_quotes::numeric / v_quotations::numeric) * 100,1) ELSE 0 END,
      'avg_order_value', CASE WHEN v_orders > 0 THEN round(v_revenue / v_orders,2) ELSE 0 END,
      'open_service_cases', v_open_cases,
      'open_inbound_responses', v_open_inbound,
      'email_delivered', v_email_delivered,
      'whatsapp_delivered', v_whatsapp_delivered,
      'sms_delivered', v_sms_delivered
    ),
    'orders_by_status', v_order_statuses,
    'quotes_by_status', v_quote_statuses,
    'top_products', v_top_products,
    'revenue_trend', v_revenue_trend,
    'recent_activity', v_recent_activity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_reporting_operational_intelligence_360(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_reporting_operational_intelligence_360(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reporting_operational_intelligence_360(integer) TO authenticated;

COMMENT ON FUNCTION public.get_reporting_operational_intelligence_360(integer) IS
  'Staff-only consolidated reporting surface. Reads canonical commerce, finance, service and communications data server-side without exposing unrestricted aggregate queries to the browser.';
