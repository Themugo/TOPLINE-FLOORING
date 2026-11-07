-- Phase 17: strengthen the existing canonical site_visits workflow.
-- No parallel visit model is introduced.

CREATE OR REPLACE FUNCTION public.create_site_visit(
  p_quotation_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_scheduled_date date DEFAULT NULL,
  p_scheduled_time time DEFAULT NULL,
  p_visit_type text DEFAULT 'site_survey',
  p_assigned_to uuid DEFAULT NULL,
  p_visit_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_customer_id uuid := p_customer_id;
  v_project_id uuid;
  v_quotation public.quotations%ROWTYPE;
  v_project public.projects%ROWTYPE;
BEGIN
  IF NOT private.current_user_has_permission('projects','insert') THEN
    RAISE EXCEPTION 'Insufficient permission to schedule site visits';
  END IF;
  IF p_scheduled_date IS NULL THEN
    RETURN json_build_object('success',false,'error','Scheduled date is required');
  END IF;
  IF p_scheduled_date < current_date OR (p_scheduled_date = current_date AND p_scheduled_time IS NOT NULL AND p_scheduled_time < localtime) THEN
    RETURN json_build_object('success',false,'error','Scheduled date and time cannot be in the past');
  END IF;
  IF p_visit_type IS NULL OR length(trim(p_visit_type)) = 0 OR length(trim(p_visit_type)) > 80 THEN
    RETURN json_build_object('success',false,'error','Visit type must contain 1 to 80 characters');
  END IF;
  IF p_visit_notes IS NOT NULL AND length(p_visit_notes) > 4000 THEN
    RETURN json_build_object('success',false,'error','Visit notes cannot exceed 4000 characters');
  END IF;

  IF p_quotation_id IS NOT NULL THEN
    SELECT * INTO v_quotation FROM public.quotations WHERE id=p_quotation_id FOR KEY SHARE;
    IF v_quotation.id IS NULL THEN
      RETURN json_build_object('success',false,'error','Quotation not found');
    END IF;
    SELECT * INTO v_project FROM public.projects WHERE quotation_id=p_quotation_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR KEY SHARE;
    IF v_project.id IS NOT NULL THEN v_project_id := v_project.id; END IF;
    IF v_customer_id IS NULL THEN v_customer_id := coalesce(v_quotation.customer_id,v_project.customer_id); END IF;
    IF v_quotation.customer_id IS NOT NULL AND v_customer_id IS DISTINCT FROM v_quotation.customer_id THEN
      RETURN json_build_object('success',false,'error','Customer does not match the quotation');
    END IF;
    IF v_project.customer_id IS NOT NULL AND v_customer_id IS DISTINCT FROM v_project.customer_id THEN
      RETURN json_build_object('success',false,'error','Customer does not match the linked project');
    END IF;
    IF v_project_id IS NOT NULL AND v_project.quotation_id IS DISTINCT FROM p_quotation_id THEN
      RETURN json_build_object('success',false,'error','Project does not match the quotation');
    END IF;
  END IF;

  IF v_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id=v_customer_id) THEN
    RETURN json_build_object('success',false,'error','Customer not found');
  END IF;
  IF p_assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_profiles WHERE user_id=p_assigned_to AND is_active=true
  ) THEN
    RETURN json_build_object('success',false,'error','Assigned staff member is not active');
  END IF;

  INSERT INTO public.site_visits(
    project_id,quotation_id,customer_id,scheduled_date,scheduled_time,visit_type,assigned_to,visit_notes
  ) VALUES (
    v_project_id,p_quotation_id,v_customer_id,p_scheduled_date,p_scheduled_time,
    trim(p_visit_type),p_assigned_to,nullif(trim(p_visit_notes),'')
  ) RETURNING id INTO v_id;

  INSERT INTO public.sales_project_lifecycle_events(
    event_type,quotation_id,customer_id,project_id,site_visit_id,new_status,metadata,actor_user_id
  ) VALUES (
    'site_visit_scheduled',p_quotation_id,v_customer_id,v_project_id,v_id,'scheduled',
    jsonb_build_object('scheduled_date',p_scheduled_date,'scheduled_time',p_scheduled_time,'visit_type',trim(p_visit_type),'assigned_to',p_assigned_to),auth.uid()
  );
  RETURN json_build_object('success',true,'site_visit_id',v_id,'project_id',v_project_id,'customer_id',v_customer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_site_visit_status(
  p_visit_id uuid,
  p_status text,
  p_visit_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old text;
  v_id uuid;
  v_project_id uuid;
  v_quotation_id uuid;
  v_customer_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('projects','update') THEN
    RAISE EXCEPTION 'Insufficient permission to update site visits';
  END IF;
  IF p_status NOT IN ('scheduled','completed','cancelled') THEN
    RETURN json_build_object('success',false,'error','Invalid site visit status; use the reschedule workflow to change appointment time');
  END IF;
  IF p_visit_notes IS NOT NULL AND length(p_visit_notes) > 4000 THEN
    RETURN json_build_object('success',false,'error','Visit notes cannot exceed 4000 characters');
  END IF;

  SELECT status,project_id,quotation_id,customer_id
    INTO v_old,v_project_id,v_quotation_id,v_customer_id
    FROM public.site_visits WHERE id=p_visit_id FOR UPDATE;
  IF v_old IS NULL THEN
    RETURN json_build_object('success',false,'error','Site visit not found');
  END IF;
  IF v_old IN ('completed','cancelled') AND p_status <> v_old THEN
    RETURN json_build_object('success',false,'error','Completed or cancelled site visits cannot be reopened');
  END IF;
  IF v_old='rescheduled' AND p_status NOT IN ('scheduled','cancelled') THEN
    RETURN json_build_object('success',false,'error','Invalid rescheduled visit transition');
  END IF;

  UPDATE public.site_visits
     SET status=p_status,visit_notes=coalesce(nullif(trim(p_visit_notes),''),visit_notes),updated_at=now()
   WHERE id=p_visit_id RETURNING id INTO v_id;
  IF v_old IS DISTINCT FROM p_status OR p_visit_notes IS NOT NULL THEN
    INSERT INTO public.sales_project_lifecycle_events(
      event_type,quotation_id,customer_id,project_id,site_visit_id,previous_status,new_status,metadata,actor_user_id
    ) VALUES (
      'site_visit_status_changed',v_quotation_id,v_customer_id,v_project_id,v_id,v_old,p_status,
      jsonb_build_object('notes_changed',p_visit_notes IS NOT NULL),auth.uid()
    );
  END IF;
  RETURN json_build_object('success',true,'site_visit_id',v_id,'status',p_status,'previous_status',v_old);
END;
$$;

REVOKE ALL ON FUNCTION public.create_site_visit(uuid,uuid,date,time,text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_site_visit_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_site_visit(uuid,uuid,date,time,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_site_visit_status(uuid,text,text) TO authenticated;
