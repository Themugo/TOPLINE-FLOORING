-- Phase 41: operational health snapshot for the Topline admin portal.

CREATE OR REPLACE FUNCTION public.get_system_health_snapshot()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_result jsonb;
BEGIN
  v_user := private.require_staff_permission('reports','select');
  SELECT jsonb_build_object(
    'checked_at', now(),
    'database', jsonb_build_object('status','healthy','server_time',now()),
    'staff', jsonb_build_object('active_count',(SELECT count(*) FROM public.staff_profiles WHERE is_active=true)),
    'customers', jsonb_build_object('count',(SELECT count(*) FROM public.customers)),
    'orders', jsonb_build_object('open_count',(SELECT count(*) FROM public.orders WHERE status NOT IN ('completed','cancelled'))),
    'projects', jsonb_build_object('active_count',(SELECT count(*) FROM public.projects WHERE status NOT IN ('completed','cancelled'))),
    'inventory', jsonb_build_object('low_stock_alerts',(SELECT count(*) FROM public.inventory_alerts WHERE is_resolved=false)),
    'communications', jsonb_build_object('queued',(SELECT count(*) FROM public.communication_outbox WHERE status='queued'),'failed',(SELECT count(*) FROM public.communication_outbox WHERE status='failed')),
    'tables', jsonb_build_object(
      'orders',to_regclass('public.orders') IS NOT NULL,
      'projects',to_regclass('public.projects') IS NOT NULL,
      'products',to_regclass('public.products') IS NOT NULL,
      'communication_outbox',to_regclass('public.communication_outbox') IS NOT NULL,
      'activity_logs',to_regclass('public.activity_logs') IS NOT NULL
    )
  ) INTO v_result;
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_system_health_snapshot() TO authenticated;
