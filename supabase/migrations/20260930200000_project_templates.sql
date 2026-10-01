-- Project templates: replaces browser localStorage ("project_templates_cache") and the
-- hard-coded sample templates in ProjectTemplateLibrary. Templates are business data and
-- must be shared between staff, so they live in the database behind RBAC.

CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  category text NOT NULL DEFAULT '',
  service_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  default_materials text NOT NULL DEFAULT '',
  default_estimated_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (default_estimated_budget >= 0),
  default_area_size text NOT NULL DEFAULT '',
  phases jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(phases) = 'array'),
  default_expense_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(default_expense_items) = 'array'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_templates_created_idx ON public.project_templates (created_at DESC);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;

DROP POLICY IF EXISTS project_templates_staff_select ON public.project_templates;
CREATE POLICY project_templates_staff_select ON public.project_templates
  FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','select'));

DROP POLICY IF EXISTS project_templates_staff_insert ON public.project_templates;
CREATE POLICY project_templates_staff_insert ON public.project_templates
  FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('projects','insert'));

DROP POLICY IF EXISTS project_templates_staff_update ON public.project_templates;
CREATE POLICY project_templates_staff_update ON public.project_templates
  FOR UPDATE TO authenticated
  USING (private.current_user_has_permission('projects','update'))
  WITH CHECK (private.current_user_has_permission('projects','update'));

DROP POLICY IF EXISTS project_templates_staff_delete ON public.project_templates;
CREATE POLICY project_templates_staff_delete ON public.project_templates
  FOR DELETE TO authenticated USING (private.current_user_has_permission('projects','delete'));

DROP TRIGGER IF EXISTS trg_project_templates_touch_updated_at ON public.project_templates;
CREATE TRIGGER trg_project_templates_touch_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_topline_audit_project_templates ON public.project_templates;
CREATE TRIGGER trg_topline_audit_project_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION private.audit_log_change();

COMMENT ON TABLE public.project_templates IS 'Staff-defined project templates (phases, materials, cost benchmarks). No seeded sample data.';
