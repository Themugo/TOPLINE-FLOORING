-- Phase 46: authoritative project cost ledger and profitability calculations.

CREATE TABLE IF NOT EXISTS public.project_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('materials','labor','equipment','transport','subcontractor','permits','other')),
  description text NOT NULL,
  estimated_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (estimated_amount >= 0),
  actual_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (actual_amount >= 0),
  reference_type text,
  reference_id uuid,
  incurred_at date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_cost_entries_project_idx ON public.project_cost_entries(project_id, incurred_at DESC);
CREATE INDEX IF NOT EXISTS project_cost_entries_category_idx ON public.project_cost_entries(project_id, category);

ALTER TABLE public.project_cost_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_cost_entries FROM anon;
GRANT SELECT ON public.project_cost_entries TO authenticated;
DROP POLICY IF EXISTS project_cost_entries_staff_read ON public.project_cost_entries;
CREATE POLICY project_cost_entries_staff_read ON public.project_cost_entries FOR SELECT TO authenticated
USING (private.current_user_has_permission('projects','select') OR private.current_user_has_permission('reports','select'));

CREATE OR REPLACE FUNCTION public.recalculate_project_costs(p_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_est numeric(12,2); v_actual numeric(12,2); v_value numeric(12,2); v_margin numeric(12,2); v_margin_pct numeric(8,2);
BEGIN
  SELECT COALESCE(SUM(estimated_amount),0),COALESCE(SUM(actual_amount),0) INTO v_est,v_actual FROM public.project_cost_entries WHERE project_id=p_project_id;
  SELECT COALESCE(project_value,0) INTO v_value FROM public.projects WHERE id=p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  v_margin := v_value - v_actual;
  v_margin_pct := CASE WHEN v_value > 0 THEN round((v_margin / v_value) * 100,2) ELSE 0 END;
  UPDATE public.projects SET estimated_cost=v_est,actual_cost=v_actual,updated_at=now() WHERE id=p_project_id;
  RETURN jsonb_build_object('success',true,'project_id',p_project_id,'estimated_cost',v_est,'actual_cost',v_actual,'project_value',v_value,'gross_margin',v_margin,'gross_margin_percentage',v_margin_pct);
END; $$;

CREATE OR REPLACE FUNCTION public.add_project_cost_entry(
  p_project_id uuid,
  p_category text,
  p_description text,
  p_estimated_amount numeric DEFAULT 0,
  p_actual_amount numeric DEFAULT 0,
  p_incurred_at date DEFAULT current_date,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid; v_result jsonb;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_category NOT IN ('materials','labor','equipment','transport','subcontractor','permits','other') THEN RAISE EXCEPTION 'Invalid cost category'; END IF;
  IF nullif(trim(p_description),'') IS NULL THEN RAISE EXCEPTION 'Cost description is required'; END IF;
  IF p_estimated_amount < 0 OR p_actual_amount < 0 THEN RAISE EXCEPTION 'Cost amounts cannot be negative'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  INSERT INTO public.project_cost_entries(project_id,category,description,estimated_amount,actual_amount,incurred_at,reference_type,reference_id,notes,created_by)
  VALUES(p_project_id,p_category,trim(p_description),p_estimated_amount,p_actual_amount,COALESCE(p_incurred_at,current_date),p_reference_type,p_reference_id,p_notes,v_user) RETURNING id INTO v_id;
  v_result := public.recalculate_project_costs(p_project_id);
  RETURN v_result || jsonb_build_object('cost_entry_id',v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.update_project_cost_entry(
  p_entry_id uuid,
  p_category text,
  p_description text,
  p_estimated_amount numeric,
  p_actual_amount numeric,
  p_incurred_at date DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_project_id uuid; v_result jsonb;
BEGIN
  PERFORM private.require_staff_permission('projects','update');
  IF p_category NOT IN ('materials','labor','equipment','transport','subcontractor','permits','other') THEN RAISE EXCEPTION 'Invalid cost category'; END IF;
  IF p_estimated_amount < 0 OR p_actual_amount < 0 THEN RAISE EXCEPTION 'Cost amounts cannot be negative'; END IF;
  SELECT project_id INTO v_project_id FROM public.project_cost_entries WHERE id=p_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cost entry not found'; END IF;
  UPDATE public.project_cost_entries SET category=p_category,description=trim(p_description),estimated_amount=p_estimated_amount,actual_amount=p_actual_amount,incurred_at=COALESCE(p_incurred_at,incurred_at),notes=p_notes,updated_at=now() WHERE id=p_entry_id;
  v_result := public.recalculate_project_costs(v_project_id);
  RETURN v_result || jsonb_build_object('cost_entry_id',p_entry_id);
END; $$;

CREATE OR REPLACE FUNCTION public.delete_project_cost_entry(p_entry_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_project_id uuid; v_result jsonb;
BEGIN
  PERFORM private.require_staff_permission('projects','update');
  SELECT project_id INTO v_project_id FROM public.project_cost_entries WHERE id=p_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cost entry not found'; END IF;
  DELETE FROM public.project_cost_entries WHERE id=p_entry_id;
  v_result := public.recalculate_project_costs(v_project_id);
  RETURN v_result || jsonb_build_object('deleted',true,'cost_entry_id',p_entry_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.recalculate_project_costs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_project_cost_entry(uuid,text,text,numeric,numeric,date,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_project_cost_entry(uuid,text,text,numeric,numeric,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_project_cost_entry(uuid) TO authenticated;

DROP TRIGGER IF EXISTS trg_project_cost_entries_updated_at ON public.project_cost_entries;
CREATE TRIGGER trg_project_cost_entries_updated_at BEFORE UPDATE ON public.project_cost_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
