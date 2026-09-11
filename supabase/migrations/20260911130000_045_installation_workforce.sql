-- Phase 45: installation workforce scheduling and field execution control.

CREATE TABLE IF NOT EXISTS public.installation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assignment_role text NOT NULL DEFAULT 'installer' CHECK (assignment_role IN ('lead_installer','installer','technician','supervisor','helper')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','declined','completed','removed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installation_id, staff_user_id)
);
CREATE INDEX IF NOT EXISTS installation_assignments_installation_idx ON public.installation_assignments(installation_id, status);
CREATE INDEX IF NOT EXISTS installation_assignments_staff_idx ON public.installation_assignments(staff_user_id, status);

ALTER TABLE public.installation_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.installation_assignments FROM anon;
GRANT SELECT ON public.installation_assignments TO authenticated;
DROP POLICY IF EXISTS installation_assignments_staff_read ON public.installation_assignments;
CREATE POLICY installation_assignments_staff_read ON public.installation_assignments FOR SELECT TO authenticated
USING (private.current_user_has_permission('projects','select'));

CREATE OR REPLACE FUNCTION public.assign_installation_staff(
  p_installation_id uuid,
  p_staff_user_id uuid,
  p_assignment_role text DEFAULT 'installer',
  p_scheduled_start timestamptz DEFAULT NULL,
  p_scheduled_end timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_assignment_role NOT IN ('lead_installer','installer','technician','supervisor','helper') THEN RAISE EXCEPTION 'Invalid assignment role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.installations WHERE id=p_installation_id) THEN RAISE EXCEPTION 'Installation not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id=p_staff_user_id AND is_active=true) THEN RAISE EXCEPTION 'Assigned staff member is not active'; END IF;
  INSERT INTO public.installation_assignments(installation_id,staff_user_id,assignment_role,scheduled_start,scheduled_end,notes)
  VALUES(p_installation_id,p_staff_user_id,p_assignment_role,p_scheduled_start,p_scheduled_end,p_notes)
  ON CONFLICT (installation_id,staff_user_id) DO UPDATE SET assignment_role=EXCLUDED.assignment_role,scheduled_start=EXCLUDED.scheduled_start,scheduled_end=EXCLUDED.scheduled_end,notes=EXCLUDED.notes,status='assigned',updated_at=now()
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'assignment_id',v_id,'installation_id',p_installation_id,'staff_user_id',p_staff_user_id,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.update_installation_status(
  p_installation_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_project_id uuid; v_current text;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('scheduled','in_progress','completed','cancelled','rescheduled') THEN RAISE EXCEPTION 'Invalid installation status'; END IF;
  SELECT project_id,status INTO v_project_id,v_current FROM public.installations WHERE id=p_installation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installation not found'; END IF;
  IF v_current='completed' AND p_status <> 'completed' THEN RAISE EXCEPTION 'Completed installation cannot be reopened'; END IF;
  UPDATE public.installations SET status=p_status,notes=COALESCE(p_notes,notes),start_time=CASE WHEN p_status='in_progress' AND start_time IS NULL THEN now() ELSE start_time END,end_time=CASE WHEN p_status='completed' THEN COALESCE(end_time,now()) ELSE end_time END,updated_at=now() WHERE id=p_installation_id;
  IF v_project_id IS NOT NULL THEN
    UPDATE public.projects SET status=CASE WHEN p_status='in_progress' THEN 'in_progress' WHEN p_status='completed' THEN 'completed' ELSE status END,updated_at=now() WHERE id=v_project_id;
  END IF;
  RETURN jsonb_build_object('success',true,'installation_id',p_installation_id,'status',p_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.remove_installation_assignment(p_assignment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('projects','update');
  UPDATE public.installation_assignments SET status='removed',updated_at=now() WHERE id=p_assignment_id AND status <> 'removed';
  RETURN FOUND;
END; $$;

GRANT EXECUTE ON FUNCTION public.assign_installation_staff(uuid,uuid,text,timestamptz,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_installation_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_installation_assignment(uuid) TO authenticated;

DROP TRIGGER IF EXISTS trg_installation_assignments_updated_at ON public.installation_assignments;
CREATE TRIGGER trg_installation_assignments_updated_at BEFORE UPDATE ON public.installation_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
