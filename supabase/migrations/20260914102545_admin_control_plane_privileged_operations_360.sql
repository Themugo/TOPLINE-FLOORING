-- Admin Control-Plane & Privileged Operations 360
-- Tighten privileged SECURITY DEFINER boundaries and eliminate customer-read based export escalation.

CREATE OR REPLACE FUNCTION private.audit_log_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_action text; v_entity_id text; v_details jsonb; v_actor uuid; v_email text;
BEGIN
  v_actor := (SELECT auth.uid());
  v_email := (SELECT u.email FROM auth.users AS u WHERE u.id = v_actor);
  IF tg_op = 'INSERT' THEN
    v_action := 'create'; v_entity_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'code', 'unknown'); v_details := jsonb_build_object('new', to_jsonb(new));
  ELSIF tg_op = 'UPDATE' THEN
    v_action := 'update'; v_entity_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'code', 'unknown'); v_details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  ELSE
    v_action := 'delete'; v_entity_id := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'user_id', to_jsonb(old)->>'code', 'unknown'); v_details := jsonb_build_object('old', to_jsonb(old));
  END IF;
  INSERT INTO public.activity_logs(action, entity_type, entity_id, details, actor_user_id, actor_email)
  VALUES (v_action, tg_table_name, v_entity_id, v_details, v_actor, v_email);
  RETURN coalesce(new, old);
END;
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_role(p_role_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_role_assignments AS ra
    JOIN public.staff_roles AS sr ON sr.id = ra.role_id
    JOIN public.staff_profiles AS sp ON sp.user_id = ra.user_id
    WHERE ra.user_id = (SELECT auth.uid()) AND sp.is_active = true AND sr.code = lower(trim(p_role_code))
  );
$$;

CREATE OR REPLACE FUNCTION private.bootstrap_owner(p_user_id uuid, p_display_name text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_role_id uuid; v_existing_staff integer;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN RAISE EXCEPTION 'bootstrap_owner is a service-role operation'; END IF;
  SELECT count(*) INTO v_existing_staff FROM public.staff_profiles;
  IF v_existing_staff > 0 THEN RAISE EXCEPTION 'Owner bootstrap has already been completed'; END IF;
  SELECT id INTO v_role_id FROM public.staff_roles WHERE code = 'owner';
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'Owner role is missing'; END IF;
  INSERT INTO public.staff_profiles(user_id, display_name, is_active)
  VALUES (p_user_id, coalesce(nullif(trim(p_display_name), ''), 'Topline Owner'), true);
  INSERT INTO public.staff_role_assignments(user_id, role_id) VALUES (p_user_id, v_role_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_operational_data_export()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'private' AS $$
DECLARE export_id uuid; payload jsonb; counts jsonb; hash text;
BEGIN
  PERFORM private.require_staff_permission('system', 'read');
  INSERT INTO public.data_export_events(export_type,status,requested_by)
  VALUES ('operational','requested',auth.uid()) RETURNING id INTO export_id;
  payload := jsonb_build_object(
    'export_id', export_id, 'exported_at', now(), 'schema_version', 'phase-13-operations-360',
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
    'customers',(SELECT count(*) FROM public.customers),'orders',(SELECT count(*) FROM public.orders),'quotations',(SELECT count(*) FROM public.quotations),'invoices',(SELECT count(*) FROM public.invoices),'projects',(SELECT count(*) FROM public.projects),'service_cases',(SELECT count(*) FROM public.service_cases),'suppliers',(SELECT count(*) FROM public.suppliers),'purchase_orders',(SELECT count(*) FROM public.purchase_orders),'warehouses',(SELECT count(*) FROM public.warehouses),'inventory_movements',(SELECT count(*) FROM public.inventory_movements)
  );
  hash := md5(payload::text);
  UPDATE public.data_export_events SET status='completed', row_counts=counts, payload_hash=hash, completed_at=now() WHERE id=export_id;
  RETURN jsonb_build_object('event',jsonb_build_object('id',export_id,'status','completed','row_counts',counts,'payload_hash',hash),'payload',payload);
EXCEPTION WHEN OTHERS THEN
  IF export_id IS NOT NULL THEN UPDATE public.data_export_events SET status='failed', completed_at=now() WHERE id=export_id; END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operational_data_export() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_operational_data_export() FROM anon;
GRANT EXECUTE ON FUNCTION public.create_operational_data_export() TO authenticated;

COMMENT ON FUNCTION public.create_operational_data_export() IS 'Sensitive operational export. Requires dedicated system.read staff permission; customer-read alone is insufficient.';
COMMENT ON FUNCTION private.audit_log_change() IS 'SECURITY DEFINER audit trigger with pinned empty search_path.';
COMMENT ON FUNCTION private.current_user_has_role(text) IS 'SECURITY DEFINER role helper with pinned empty search_path.';
COMMENT ON FUNCTION private.bootstrap_owner(uuid,text) IS 'One-time service-role-only owner bootstrap with pinned empty search_path.';
