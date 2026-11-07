-- Phase 13 follow-up: use a cryptographic, data-only export digest and keep
-- export audit history behind the dedicated system.read staff permission.
-- The digest intentionally excludes export_id/exported_at so identical table
-- snapshots produce the same hash across separate export requests.

ALTER TABLE public.data_export_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.data_export_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.data_export_events TO authenticated;
DROP POLICY IF EXISTS data_export_events_staff_read ON public.data_export_events;
CREATE POLICY data_export_events_staff_read ON public.data_export_events
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('system', 'read'));

CREATE OR REPLACE FUNCTION public.create_operational_data_export()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  export_id uuid;
  payload jsonb;
  counts jsonb;
  hash text;
BEGIN
  PERFORM private.require_staff_permission('system', 'read');

  INSERT INTO public.data_export_events(export_type, status, requested_by)
  VALUES ('operational', 'requested', auth.uid())
  RETURNING id INTO export_id;

  payload := jsonb_build_object(
    'export_id', export_id,
    'exported_at', now(),
    'schema_version', 'phase-13-operations-360',
    'tables', jsonb_build_object(
      'customers', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,name,email,phone,company,created_at,updated_at FROM public.customers ORDER BY created_at,id) x), '[]'::jsonb),
      'orders', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,order_number,customer_id,customer_email,status,total_amount,created_at,updated_at FROM public.orders ORDER BY created_at,id) x), '[]'::jsonb),
      'quotations', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,quotation_number,customer_id,email,status,total_amount,created_at,updated_at FROM public.quotations ORDER BY created_at,id) x), '[]'::jsonb),
      'invoices', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,invoice_number,customer_id,status,total_amount,amount_paid,due_date,created_at,updated_at FROM public.invoices ORDER BY created_at,id) x), '[]'::jsonb),
      'projects', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,project_number,customer_id,title,status,progress_percentage,project_value,start_date,end_date,created_at,updated_at FROM public.projects ORDER BY created_at,id) x), '[]'::jsonb),
      'service_cases', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,case_number,customer_id,type,status,priority,issue_title,reported_at,resolved_at,created_at FROM public.service_cases ORDER BY created_at,id) x), '[]'::jsonb),
      'suppliers', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,name,email,phone,is_active,created_at,updated_at FROM public.suppliers ORDER BY created_at,id) x), '[]'::jsonb),
      'purchase_orders', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,po_number,supplier_id,warehouse_id,status,total_amount,created_at,updated_at FROM public.purchase_orders ORDER BY created_at,id) x), '[]'::jsonb),
      'warehouses', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,name,code,is_active,created_at,updated_at FROM public.warehouses ORDER BY created_at,id) x), '[]'::jsonb),
      'inventory_movements', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM (SELECT id,product_id,warehouse_id,movement_type,quantity,reference_type,reference_id,created_at FROM public.inventory_movements ORDER BY created_at,id) x), '[]'::jsonb)
    )
  );

  counts := jsonb_build_object(
    'customers',(SELECT count(*) FROM public.customers),
    'orders',(SELECT count(*) FROM public.orders),
    'quotations',(SELECT count(*) FROM public.quotations),
    'invoices',(SELECT count(*) FROM public.invoices),
    'projects',(SELECT count(*) FROM public.projects),
    'service_cases',(SELECT count(*) FROM public.service_cases),
    'suppliers',(SELECT count(*) FROM public.suppliers),
    'purchase_orders',(SELECT count(*) FROM public.purchase_orders),
    'warehouses',(SELECT count(*) FROM public.warehouses),
    'inventory_movements',(SELECT count(*) FROM public.inventory_movements)
  );

  hash := encode(pg_catalog.sha256(convert_to((payload -> 'tables')::text, 'UTF8')), 'hex');
  UPDATE public.data_export_events
  SET status = 'completed', row_counts = counts, payload_hash = hash, completed_at = now()
  WHERE id = export_id;

  RETURN jsonb_build_object(
    'event', jsonb_build_object('id', export_id, 'status', 'completed', 'row_counts', counts, 'payload_hash', hash, 'hash_algorithm', 'SHA-256', 'hash_scope', 'payload.tables'),
    'payload', payload
  );
EXCEPTION WHEN OTHERS THEN
  IF export_id IS NOT NULL THEN
    UPDATE public.data_export_events SET status = 'failed', completed_at = now() WHERE id = export_id;
  END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operational_data_export() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_operational_data_export() TO authenticated;
COMMENT ON FUNCTION public.create_operational_data_export() IS
  'Staff-only operational export. SHA-256 covers canonical JSONB payload.tables and excludes per-export metadata; not a PostgreSQL backup.';
COMMENT ON TABLE public.data_export_events IS
  'Audit events for staff operational exports; SELECT is restricted to staff with system.read.';
