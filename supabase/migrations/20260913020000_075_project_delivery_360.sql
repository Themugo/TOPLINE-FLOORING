-- Operation 2: Project Delivery 360
-- Converges planning, field execution, workforce, materials, cost, quality and sign-off.

CREATE TABLE IF NOT EXISTS public.project_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_delivery_events_project_idx ON public.project_delivery_events(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_quality_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installation_id uuid REFERENCES public.installations(id) ON DELETE SET NULL,
  inspection_type text NOT NULL DEFAULT 'final',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','waived')),
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  findings text,
  corrective_action text,
  inspected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_quality_inspections_project_idx ON public.project_quality_inspections(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_quality_inspections_status_idx ON public.project_quality_inspections(project_id, status);

ALTER TABLE public.project_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_quality_inspections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_delivery_events, public.project_quality_inspections FROM anon;
GRANT SELECT ON public.project_delivery_events, public.project_quality_inspections TO authenticated;
DROP POLICY IF EXISTS project_delivery_events_read ON public.project_delivery_events;
CREATE POLICY project_delivery_events_read ON public.project_delivery_events FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));
DROP POLICY IF EXISTS project_quality_inspections_read ON public.project_quality_inspections;
CREATE POLICY project_quality_inspections_read ON public.project_quality_inspections FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));
DROP TRIGGER IF EXISTS trg_project_quality_inspections_updated_at ON public.project_quality_inspections;
CREATE TRIGGER trg_project_quality_inspections_updated_at BEFORE UPDATE ON public.project_quality_inspections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_project_quality_inspection(
  p_project_id uuid,
  p_installation_id uuid DEFAULT NULL,
  p_status text DEFAULT 'pending',
  p_score numeric DEFAULT NULL,
  p_findings text DEFAULT NULL,
  p_corrective_action text DEFAULT NULL,
  p_inspection_type text DEFAULT 'final'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('pending','passed','failed','waived') THEN RAISE EXCEPTION 'Invalid inspection status'; END IF;
  IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN RAISE EXCEPTION 'Inspection score must be between 0 and 100'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF p_installation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.installations WHERE id=p_installation_id AND project_id=p_project_id) THEN RAISE EXCEPTION 'Installation is not linked to project'; END IF;
  INSERT INTO public.project_quality_inspections(project_id,installation_id,inspection_type,status,score,findings,corrective_action,inspected_by,inspected_at)
  VALUES(p_project_id,p_installation_id,COALESCE(NULLIF(trim(p_inspection_type),''),'final'),p_status,p_score,NULLIF(trim(p_findings),''),NULLIF(trim(p_corrective_action),''),v_user,CASE WHEN p_status IN ('passed','failed','waived') THEN now() ELSE NULL END)
  RETURNING id INTO v_id;
  INSERT INTO public.project_delivery_events(project_id,event_type,payload,recorded_by) VALUES(p_project_id,'quality_inspection',jsonb_build_object('inspection_id',v_id,'status',p_status,'score',p_score),v_user);
  RETURN jsonb_build_object('success',true,'inspection_id',v_id,'project_id',p_project_id,'status',p_status,'recorded_by',v_user);
END; $$;
GRANT EXECUTE ON FUNCTION public.record_project_quality_inspection(uuid,uuid,text,numeric,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_project_delivery_status(
  p_project_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_current text; v_old text;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('pending','scheduled','in_progress','completed','cancelled') THEN RAISE EXCEPTION 'Invalid project status'; END IF;
  SELECT status INTO v_current FROM public.projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  v_old := v_current;
  IF v_current='completed' AND p_status <> 'completed' THEN RAISE EXCEPTION 'Completed project cannot be reopened'; END IF;
  IF v_current='cancelled' AND p_status NOT IN ('cancelled') THEN RAISE EXCEPTION 'Cancelled project cannot be reopened'; END IF;
  UPDATE public.projects SET status=p_status, progress_percentage=CASE WHEN p_status='completed' THEN 100 ELSE progress_percentage END, progress_notes=COALESCE(NULLIF(trim(p_notes),''),progress_notes), completion_date=CASE WHEN p_status='completed' THEN COALESCE(completion_date,current_date) ELSE completion_date END, updated_at=now() WHERE id=p_project_id;
  INSERT INTO public.project_delivery_events(project_id,event_type,from_status,to_status,payload,recorded_by) VALUES(p_project_id,'status_transition',v_old,p_status,jsonb_build_object('notes',p_notes),v_user);
  RETURN jsonb_build_object('success',true,'project_id',p_project_id,'from_status',v_old,'status',p_status,'updated_by',v_user);
END; $$;
GRANT EXECUTE ON FUNCTION public.update_project_delivery_status(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_project_delivery_360(p_project_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_project record; v_installation record; v_open_issues integer; v_open_tasks integer; v_allocated numeric; v_actual numeric; v_latest_quality text; v_signoff boolean; v_ready boolean; v_project_count integer := 0; v_result jsonb := '[]'::jsonb;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  FOR v_project IN SELECT * FROM public.projects WHERE p_project_id IS NULL OR id=p_project_id ORDER BY created_at DESC LOOP
    v_project_count := v_project_count + 1;
    SELECT i.* INTO v_installation FROM public.installations i WHERE i.project_id=v_project.id ORDER BY i.created_at DESC LIMIT 1;
    SELECT count(*)::integer INTO v_open_issues FROM public.project_issues WHERE project_id=v_project.id AND status NOT IN ('resolved','closed');
    SELECT count(*)::integer INTO v_open_tasks FROM public.project_tasks WHERE project_id=v_project.id AND status NOT IN ('completed','cancelled');
    SELECT COALESCE(SUM(quantity_allocated),0) INTO v_allocated FROM public.project_material_allocations WHERE project_id=v_project.id;
    SELECT COALESCE(SUM(actual_amount),0) INTO v_actual FROM public.project_cost_entries WHERE project_id=v_project.id;
    SELECT status INTO v_latest_quality FROM public.project_quality_inspections WHERE project_id=v_project.id ORDER BY created_at DESC LIMIT 1;
    SELECT EXISTS (SELECT 1 FROM public.project_signoffs WHERE project_id=v_project.id AND approved=true) INTO v_signoff;
    v_ready := (v_open_issues=0 AND v_open_tasks=0 AND v_project.progress_percentage=100 AND (v_installation.id IS NULL OR v_installation.status='completed') AND (v_latest_quality IS NULL OR v_latest_quality IN ('passed','waived')) AND v_signoff);
    v_result := v_result || jsonb_build_array(jsonb_build_object('project_id',v_project.id,'title',v_project.title,'status',v_project.status,'progress',v_project.progress_percentage,'installation_status',v_installation.status,'open_issues',v_open_issues,'open_tasks',v_open_tasks,'allocated_material',v_allocated,'actual_cost',v_actual,'quality_status',v_latest_quality,'customer_signoff',v_signoff,'ready_to_close',v_ready));
  END LOOP;
  RETURN jsonb_build_object('success',true,'project_count',v_project_count,'projects',v_result,'reconciled_by',v_user,'reconciled_at',now());
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_project_delivery_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_delivery_360(p_project_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_projects jsonb; v_project_ids uuid[];
BEGIN
  v_user := private.require_staff_permission('projects','select');
  SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]) INTO v_project_ids FROM public.projects WHERE p_project_id IS NULL OR id=p_project_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'project',to_jsonb(p),
    'installations',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC),'[]'::jsonb) FROM public.installations i WHERE i.project_id=p.id),
    'tasks',(SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.display_order),'[]'::jsonb) FROM public.project_tasks t WHERE t.project_id=p.id),
    'issues',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC),'[]'::jsonb) FROM public.project_issues i WHERE i.project_id=p.id),
    'materials',(SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC),'[]'::jsonb) FROM public.project_material_allocations m WHERE m.project_id=p.id),
    'costs',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.incurred_at DESC),'[]'::jsonb) FROM public.project_cost_entries c WHERE c.project_id=p.id),
    'quality',(SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC),'[]'::jsonb) FROM public.project_quality_inspections q WHERE q.project_id=p.id),
    'signoff',(SELECT to_jsonb(s) FROM public.project_signoffs s WHERE s.project_id=p.id ORDER BY s.signed_at DESC LIMIT 1),
    'workforce',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]'::jsonb) FROM public.installation_assignments a JOIN public.installations i ON i.id=a.installation_id WHERE i.project_id=p.id AND a.status <> 'removed'),
    'events',(SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) FROM public.project_delivery_events e WHERE e.project_id=p.id LIMIT 50)
  ) ORDER BY p.created_at DESC),'[]'::jsonb) INTO v_projects FROM public.projects p WHERE p.id = ANY(v_project_ids);
  RETURN jsonb_build_object('success',true,'project_count',COALESCE(array_length(v_project_ids,1),0),'projects',v_projects,'read_by',v_user,'generated_at',now());
END; $$;
GRANT EXECUTE ON FUNCTION public.get_project_delivery_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_project_with_signoff(
  p_project_id uuid, p_approved boolean, p_customer_name text DEFAULT NULL, p_signature text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_customer uuid; v_signoff uuid; v_id uuid; v_progress integer; v_installation_status text; v_open_issues integer; v_open_tasks integer; v_quality_status text;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  SELECT customer_id,progress_percentage INTO v_customer,v_progress FROM public.projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Project not found'); END IF;
  IF p_approved THEN
    IF nullif(trim(p_customer_name),'') IS NULL OR nullif(trim(p_signature),'') IS NULL THEN RAISE EXCEPTION 'Customer name and signature are required'; END IF;
    SELECT status INTO v_installation_status FROM public.installations WHERE project_id=p_project_id ORDER BY created_at DESC LIMIT 1;
    SELECT count(*)::integer INTO v_open_issues FROM public.project_issues WHERE project_id=p_project_id AND status NOT IN ('resolved','closed');
    SELECT count(*)::integer INTO v_open_tasks FROM public.project_tasks WHERE project_id=p_project_id AND status NOT IN ('completed','cancelled');
    SELECT status INTO v_quality_status FROM public.project_quality_inspections WHERE project_id=p_project_id ORDER BY created_at DESC LIMIT 1;
    IF v_progress < 100 THEN RAISE EXCEPTION 'Project must be at 100 percent before completion'; END IF;
    IF v_installation_status IS NOT NULL AND v_installation_status <> 'completed' THEN RAISE EXCEPTION 'Installation must be completed before project completion'; END IF;
    IF v_open_issues > 0 THEN RAISE EXCEPTION 'Open project issues must be resolved before completion'; END IF;
    IF v_open_tasks > 0 THEN RAISE EXCEPTION 'Open project tasks must be completed before completion'; END IF;
    IF v_quality_status IS NOT NULL AND v_quality_status NOT IN ('passed','waived') THEN RAISE EXCEPTION 'Latest quality inspection has not passed'; END IF;
  END IF;
  INSERT INTO public.project_signoffs(project_id,customer_id,approved,customer_name,signature,notes,signed_at,captured_by) VALUES(p_project_id,v_customer,p_approved,trim(p_customer_name),trim(p_signature),p_notes,CASE WHEN p_approved THEN now() ELSE NULL END,v_user) RETURNING id INTO v_signoff;
  UPDATE public.projects SET customer_approval=p_approved, completion_notes=COALESCE(p_notes,completion_notes), status=CASE WHEN p_approved THEN 'completed' ELSE status END, progress_percentage=CASE WHEN p_approved THEN 100 ELSE progress_percentage END, completion_date=CASE WHEN p_approved THEN COALESCE(completion_date,current_date) ELSE completion_date END, updated_at=now() WHERE id=p_project_id RETURNING id INTO v_id;
  INSERT INTO public.project_delivery_events(project_id,event_type,to_status,payload,recorded_by) VALUES(p_project_id,'customer_signoff',CASE WHEN p_approved THEN 'completed' ELSE NULL END,jsonb_build_object('signoff_id',v_signoff,'approved',p_approved),v_user);
  RETURN jsonb_build_object('success',true,'project_id',v_id,'signoff_id',v_signoff,'approved',p_approved);
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_project_with_signoff(uuid,boolean,text,text,text) TO authenticated;

-- Sensitive execution records are read-only from the browser; mutations go through SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.project_delivery_events, public.project_quality_inspections FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.project_signoffs FROM authenticated;
