-- Phase 61: Field Operations 360
-- Normalized field execution records around the canonical installations/site_visits/projects model.

CREATE TABLE IF NOT EXISTS public.installation_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  site_visit_id uuid REFERENCES public.site_visits(id) ON DELETE SET NULL,
  surface_name text NOT NULL,
  length numeric(12,3) CHECK (length IS NULL OR length >= 0),
  width numeric(12,3) CHECK (width IS NULL OR width >= 0),
  depth numeric(12,3) CHECK (depth IS NULL OR depth >= 0),
  area numeric(12,3) CHECK (area IS NULL OR area >= 0),
  unit text NOT NULL DEFAULT 'sqm',
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installation_material_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'sqm',
  status text NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','issued','returned','cancelled')),
  notes text,
  allocated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installation_progress_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  percent_complete integer NOT NULL CHECK (percent_complete BETWEEN 0 AND 100),
  work_summary text NOT NULL,
  blockers text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution_notes text,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installation_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL UNIQUE REFERENCES public.installations(id) ON DELETE CASCADE,
  signed_by_name text NOT NULL,
  signer_role text,
  notes text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS installation_measurements_installation_idx ON public.installation_measurements(installation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS installation_material_allocations_installation_idx ON public.installation_material_allocations(installation_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS installation_progress_updates_installation_idx ON public.installation_progress_updates(installation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS installation_issues_installation_idx ON public.installation_issues(installation_id, status, severity);

ALTER TABLE public.installation_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_material_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_signoffs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.installation_measurements, public.installation_material_allocations, public.installation_progress_updates, public.installation_issues, public.installation_signoffs FROM anon;
GRANT SELECT ON public.installation_measurements, public.installation_material_allocations, public.installation_progress_updates, public.installation_issues, public.installation_signoffs TO authenticated;

DROP POLICY IF EXISTS field_operations_measurements_read ON public.installation_measurements;
CREATE POLICY field_operations_measurements_read ON public.installation_measurements FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));
DROP POLICY IF EXISTS field_operations_materials_read ON public.installation_material_allocations;
CREATE POLICY field_operations_materials_read ON public.installation_material_allocations FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));
DROP POLICY IF EXISTS field_operations_progress_read ON public.installation_progress_updates;
CREATE POLICY field_operations_progress_read ON public.installation_progress_updates FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));
DROP POLICY IF EXISTS field_operations_issues_read ON public.installation_issues;
CREATE POLICY field_operations_issues_read ON public.installation_issues FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));
DROP POLICY IF EXISTS field_operations_signoffs_read ON public.installation_signoffs;
CREATE POLICY field_operations_signoffs_read ON public.installation_signoffs FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));

DROP TRIGGER IF EXISTS trg_installation_material_allocations_updated_at ON public.installation_material_allocations;
CREATE TRIGGER trg_installation_material_allocations_updated_at BEFORE UPDATE ON public.installation_material_allocations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_installation_issues_updated_at ON public.installation_issues;
CREATE TRIGGER trg_installation_issues_updated_at BEFORE UPDATE ON public.installation_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_installation_measurement(
  p_installation_id uuid,
  p_surface_name text,
  p_length numeric DEFAULT NULL,
  p_width numeric DEFAULT NULL,
  p_depth numeric DEFAULT NULL,
  p_area numeric DEFAULT NULL,
  p_unit text DEFAULT 'sqm',
  p_site_visit_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF NOT EXISTS (SELECT 1 FROM public.installations WHERE id = p_installation_id) THEN RAISE EXCEPTION 'Installation not found'; END IF;
  IF nullif(trim(p_surface_name),'') IS NULL THEN RAISE EXCEPTION 'Surface name is required'; END IF;
  IF p_length IS NULL AND p_width IS NULL AND p_area IS NULL THEN RAISE EXCEPTION 'At least one measurement value is required'; END IF;
  IF p_site_visit_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.site_visits WHERE id=p_site_visit_id AND (project_id=(SELECT project_id FROM public.installations WHERE id=p_installation_id) OR project_id IS NULL)) THEN RAISE EXCEPTION 'Site visit is not linked to the installation project'; END IF;
  INSERT INTO public.installation_measurements(installation_id,site_visit_id,surface_name,length,width,depth,area,unit,notes,recorded_by)
  VALUES(p_installation_id,p_site_visit_id,trim(p_surface_name),p_length,p_width,p_depth,p_area,coalesce(nullif(trim(p_unit),''),'sqm'),nullif(trim(p_notes),''),v_user)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'measurement_id',v_id,'installation_id',p_installation_id,'recorded_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.allocate_installation_material(
  p_installation_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_unit text DEFAULT 'sqm',
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF NOT EXISTS (SELECT 1 FROM public.installations WHERE id=p_installation_id) THEN RAISE EXCEPTION 'Installation not found'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Material quantity must be greater than zero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id=p_product_id AND is_active=true) THEN RAISE EXCEPTION 'Active product not found'; END IF;
  INSERT INTO public.installation_material_allocations(installation_id,product_id,quantity,unit,notes,allocated_by)
  VALUES(p_installation_id,p_product_id,p_quantity,coalesce(nullif(trim(p_unit),''),'sqm'),nullif(trim(p_notes),''),v_user)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'allocation_id',v_id,'installation_id',p_installation_id,'product_id',p_product_id,'quantity',p_quantity,'allocated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.update_installation_material_allocation(
  p_allocation_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('allocated','issued','returned','cancelled') THEN RAISE EXCEPTION 'Invalid material allocation status'; END IF;
  UPDATE public.installation_material_allocations SET status=p_status, notes=coalesce(nullif(trim(p_notes),''),notes), updated_at=now() WHERE id=p_allocation_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Material allocation not found'; END IF;
  RETURN jsonb_build_object('success',true,'allocation_id',v_id,'status',p_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.record_installation_progress(
  p_installation_id uuid,
  p_percent_complete integer,
  p_work_summary text,
  p_blockers text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid; v_project uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_percent_complete < 0 OR p_percent_complete > 100 THEN RAISE EXCEPTION 'Progress must be between 0 and 100'; END IF;
  IF nullif(trim(p_work_summary),'') IS NULL THEN RAISE EXCEPTION 'Work summary is required'; END IF;
  SELECT project_id INTO v_project FROM public.installations WHERE id=p_installation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installation not found'; END IF;
  INSERT INTO public.installation_progress_updates(installation_id,percent_complete,work_summary,blockers,recorded_by)
  VALUES(p_installation_id,p_percent_complete,trim(p_work_summary),nullif(trim(p_blockers),''),v_user) RETURNING id INTO v_id;
  UPDATE public.installations SET status=CASE WHEN p_percent_complete=100 THEN 'completed' WHEN p_percent_complete>0 THEN 'in_progress' ELSE status END, start_time=CASE WHEN p_percent_complete>0 AND start_time IS NULL THEN now() ELSE start_time END, end_time=CASE WHEN p_percent_complete=100 THEN coalesce(end_time,now()) ELSE end_time END, updated_at=now() WHERE id=p_installation_id;
  IF v_project IS NOT NULL THEN
    UPDATE public.projects p SET progress_percentage=round((SELECT avg(latest.percent_complete) FROM (SELECT DISTINCT ON (i.id) i.id, coalesce(u.percent_complete,0) percent_complete FROM public.installations i LEFT JOIN public.installation_progress_updates u ON u.installation_id=i.id WHERE i.project_id=v_project ORDER BY i.id,u.created_at DESC) latest)::numeric)::integer, status=CASE WHEN EXISTS (SELECT 1 FROM public.installations WHERE project_id=v_project AND status='in_progress') THEN 'in_progress' WHEN NOT EXISTS (SELECT 1 FROM public.installations WHERE project_id=v_project AND status NOT IN ('completed','cancelled')) THEN 'completed' ELSE p.status END, completion_date=CASE WHEN NOT EXISTS (SELECT 1 FROM public.installations WHERE project_id=v_project AND status NOT IN ('completed','cancelled')) THEN coalesce(p.completion_date,current_date) ELSE p.completion_date END, updated_at=now() WHERE p.id=v_project;
  END IF;
  RETURN jsonb_build_object('success',true,'progress_update_id',v_id,'installation_id',p_installation_id,'percent_complete',p_percent_complete,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.report_installation_issue(
  p_installation_id uuid,
  p_severity text,
  p_category text,
  p_description text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_severity NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid issue severity'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.installations WHERE id=p_installation_id) THEN RAISE EXCEPTION 'Installation not found'; END IF;
  IF nullif(trim(p_description),'') IS NULL THEN RAISE EXCEPTION 'Issue description is required'; END IF;
  INSERT INTO public.installation_issues(installation_id,severity,category,description,reported_by)
  VALUES(p_installation_id,p_severity,coalesce(nullif(trim(p_category),''),'general'),trim(p_description),v_user) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'issue_id',v_id,'installation_id',p_installation_id,'reported_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_installation_issue(
  p_issue_id uuid,
  p_status text,
  p_resolution_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('open','in_progress','resolved','closed') THEN RAISE EXCEPTION 'Invalid issue status'; END IF;
  UPDATE public.installation_issues SET status=p_status,resolution_notes=coalesce(nullif(trim(p_resolution_notes),''),resolution_notes),resolved_by=CASE WHEN p_status IN ('resolved','closed') THEN v_user ELSE resolved_by END,resolved_at=CASE WHEN p_status IN ('resolved','closed') THEN coalesce(resolved_at,now()) ELSE resolved_at END,updated_at=now() WHERE id=p_issue_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Installation issue not found'; END IF;
  RETURN jsonb_build_object('success',true,'issue_id',v_id,'status',p_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.signoff_installation(
  p_installation_id uuid,
  p_signed_by_name text,
  p_signer_role text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid; v_project uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF nullif(trim(p_signed_by_name),'') IS NULL THEN RAISE EXCEPTION 'Sign-off name is required'; END IF;
  SELECT project_id INTO v_project FROM public.installations WHERE id=p_installation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installation not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.installation_issues WHERE installation_id=p_installation_id AND status IN ('open','in_progress')) THEN RAISE EXCEPTION 'Open installation issues must be resolved before sign-off'; END IF;
  INSERT INTO public.installation_signoffs(installation_id,signed_by_name,signer_role,notes,recorded_by)
  VALUES(p_installation_id,trim(p_signed_by_name),nullif(trim(p_signer_role),''),nullif(trim(p_notes),''),v_user)
  ON CONFLICT (installation_id) DO UPDATE SET signed_by_name=EXCLUDED.signed_by_name,signer_role=EXCLUDED.signer_role,notes=EXCLUDED.notes,signed_at=now(),recorded_by=EXCLUDED.recorded_by
  RETURNING id INTO v_id;
  UPDATE public.installations SET status='completed',end_time=coalesce(end_time,now()),updated_at=now() WHERE id=p_installation_id;
  IF v_project IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.installations WHERE project_id=v_project AND status NOT IN ('completed','cancelled')) THEN
    UPDATE public.projects SET status='completed',progress_percentage=100,completion_date=coalesce(completion_date,current_date),updated_at=now() WHERE id=v_project;
  END IF;
  RETURN jsonb_build_object('success',true,'signoff_id',v_id,'installation_id',p_installation_id,'status','completed','updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.get_installation_operations_360(p_installation_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,private AS $$
SELECT jsonb_build_object(
  'installation', (SELECT to_jsonb(i) FROM public.installations i WHERE i.id=p_installation_id),
  'project', (SELECT to_jsonb(p) FROM public.projects p WHERE p.id=(SELECT project_id FROM public.installations WHERE id=p_installation_id)),
  'assignments', coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC) FROM public.installation_assignments a WHERE a.installation_id=p_installation_id AND a.status <> 'removed'),'[]'::jsonb),
  'measurements', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.installation_measurements m WHERE m.installation_id=p_installation_id),'[]'::jsonb),
  'materials', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.installation_material_allocations m WHERE m.installation_id=p_installation_id),'[]'::jsonb),
  'progress', coalesce((SELECT jsonb_agg(to_jsonb(u) ORDER BY u.created_at DESC) FROM public.installation_progress_updates u WHERE u.installation_id=p_installation_id),'[]'::jsonb),
  'issues', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM public.installation_issues x WHERE x.installation_id=p_installation_id),'[]'::jsonb),
  'signoff', (SELECT to_jsonb(s) FROM public.installation_signoffs s WHERE s.installation_id=p_installation_id)
)
WHERE private.current_user_has_permission('projects','select');
$$;

REVOKE ALL ON FUNCTION public.record_installation_measurement(uuid,text,numeric,numeric,numeric,numeric,text,uuid,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.allocate_installation_material(uuid,uuid,numeric,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.update_installation_material_allocation(uuid,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.record_installation_progress(uuid,integer,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.report_installation_issue(uuid,text,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.resolve_installation_issue(uuid,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.signoff_installation(uuid,text,text,text) FROM public,anon;
REVOKE ALL ON FUNCTION public.get_installation_operations_360(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.record_installation_measurement(uuid,text,numeric,numeric,numeric,numeric,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_installation_material(uuid,uuid,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_installation_material_allocation(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_installation_progress(uuid,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_installation_issue(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_installation_issue(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.signoff_installation(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_installation_operations_360(uuid) TO authenticated;
