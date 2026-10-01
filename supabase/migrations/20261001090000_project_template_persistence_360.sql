-- Phase 1-7 hardening: persist custom project templates in the canonical database.
-- Built-in templates remain source-controlled fixtures; only staff-created custom templates
-- are stored here so operational configuration does not depend on browser localStorage.

CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  category text NOT NULL CHECK (char_length(trim(category)) BETWEEN 1 AND 120),
  service_type text NOT NULL CHECK (char_length(trim(service_type)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '',
  default_materials text NOT NULL DEFAULT '',
  default_estimated_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (default_estimated_budget >= 0),
  default_area_size text NOT NULL DEFAULT '',
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_expense_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_templates_phases_array CHECK (jsonb_typeof(phases) = 'array'),
  CONSTRAINT project_templates_expenses_array CHECK (jsonb_typeof(default_expense_items) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS project_templates_name_unique_idx
  ON public.project_templates (lower(trim(name)));
CREATE INDEX IF NOT EXISTS project_templates_updated_idx
  ON public.project_templates (updated_at DESC);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;

DROP POLICY IF EXISTS project_templates_staff_select ON public.project_templates;
CREATE POLICY project_templates_staff_select ON public.project_templates
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('projects','select'));

DROP POLICY IF EXISTS project_templates_staff_insert ON public.project_templates;
CREATE POLICY project_templates_staff_insert ON public.project_templates
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_has_permission('projects','insert') AND created_by = auth.uid());

DROP POLICY IF EXISTS project_templates_staff_update ON public.project_templates;
CREATE POLICY project_templates_staff_update ON public.project_templates
  FOR UPDATE TO authenticated
  USING (private.current_user_has_permission('projects','update'))
  WITH CHECK (private.current_user_has_permission('projects','update'));

DROP POLICY IF EXISTS project_templates_staff_delete ON public.project_templates;
CREATE POLICY project_templates_staff_delete ON public.project_templates
  FOR DELETE TO authenticated
  USING (private.current_user_has_permission('projects','delete'));

CREATE OR REPLACE FUNCTION public.set_project_template_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_templates_set_created_by ON public.project_templates;
CREATE TRIGGER project_templates_set_created_by
BEFORE INSERT ON public.project_templates
FOR EACH ROW EXECUTE FUNCTION public.set_project_template_created_by();

CREATE OR REPLACE FUNCTION public.set_project_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_templates_set_updated_at ON public.project_templates;
CREATE TRIGGER project_templates_set_updated_at
BEFORE UPDATE ON public.project_templates
FOR EACH ROW EXECUTE FUNCTION public.set_project_template_updated_at();
