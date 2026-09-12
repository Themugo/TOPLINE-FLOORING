-- Phase 13: Backup & Data Export Operations 360.
-- Supabase remains the authoritative PostgreSQL backup provider. Topline records
-- controlled export requests and exposes an explicit, staff-authorized snapshot.

CREATE TABLE IF NOT EXISTS public.data_export_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type text NOT NULL DEFAULT 'operational',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('requested','completed','failed')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS data_export_events_created_idx ON public.data_export_events(created_at DESC);
CREATE INDEX IF NOT EXISTS data_export_events_requested_by_idx ON public.data_export_events(requested_by, created_at DESC);

ALTER TABLE public.data_export_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_export_events FROM anon;
GRANT SELECT ON public.data_export_events TO authenticated;
DROP POLICY IF EXISTS data_export_events_staff_read ON public.data_export_events;
CREATE POLICY data_export_events_staff_read ON public.data_export_events
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('system','read') OR private.current_user_has_permission('customers','read'));

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
  IF NOT private.current_user_has_permission('system','read')
     AND NOT private.current_user_has_permission('customers','read') THEN
    RAISE EXCEPTION 'Staff permission required for operational data export';
  END IF;

  INSERT INTO public.data_export_events(export_type,status,requested_by)
  VALUES ('operational','requested',auth.uid())
  RETURNING id INTO export_id;

  payload := jsonb_build_object(
    'export_id', export_id,
    'exported_at', now(),
    'schema_version', 'phase-13-operations-360',
    'tables', jsonb_build_object(
      'customers', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,name,email,phone,company,created_at,updated_at FROM public.customers ORDER BY created_at) x), '[]'::jsonb),
      'orders', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,order_number,customer_id,customer_email,status,total_amount,created_at,updated_at FROM public.orders ORDER BY created_at) x), '[]'::jsonb),
      'quotations', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,quotation_number,customer_id,email,status,total_amount,created_at,updated_at FROM public.quotations ORDER BY created_at) x), '[]'::jsonb),
      'invoices', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,invoice_number,customer_id,status,total_amount,amount_paid,due_date,created_at,updated_at FROM public.invoices ORDER BY created_at) x), '[]'::jsonb),
      'projects', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,project_number,customer_id,title,status,progress_percentage,project_value,start_date,end_date,created_at,updated_at FROM public.projects ORDER BY created_at) x), '[]'::jsonb),
      'service_cases', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,case_number,customer_id,type,status,priority,issue_title,reported_at,resolved_at,created_at FROM public.service_cases ORDER BY created_at) x), '[]'::jsonb),
      'suppliers', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,name,email,phone,is_active,created_at,updated_at FROM public.suppliers ORDER BY created_at) x), '[]'::jsonb),
      'purchase_orders', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,po_number,supplier_id,warehouse_id,status,total_amount,created_at,updated_at FROM public.purchase_orders ORDER BY created_at) x), '[]'::jsonb),
      'warehouses', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,name,code,is_active,created_at,updated_at FROM public.warehouses ORDER BY created_at) x), '[]'::jsonb),
      'inventory_movements', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,product_id,warehouse_id,movement_type,quantity,reference_type,reference_id,created_at FROM public.inventory_movements ORDER BY created_at) x), '[]'::jsonb)
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

  hash := md5(payload::text);
  UPDATE public.data_export_events
  SET status='completed', row_counts=counts, payload_hash=hash, completed_at=now()
  WHERE id=export_id;

  RETURN jsonb_build_object('event',jsonb_build_object('id',export_id,'status','completed','row_counts',counts,'payload_hash',hash),'payload',payload);
EXCEPTION WHEN OTHERS THEN
  IF export_id IS NOT NULL THEN
    UPDATE public.data_export_events SET status='failed', completed_at=now() WHERE id=export_id;
  END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operational_data_export() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_operational_data_export() TO authenticated;
