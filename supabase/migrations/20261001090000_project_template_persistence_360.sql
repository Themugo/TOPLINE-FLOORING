-- Phase 1-7 hardening: complete persistence hardening for the canonical
-- project_templates table created by 20260930200000_project_templates.sql.
--
-- This migration deliberately does not recreate the table. The earlier
-- migration is the canonical owner of the table definition; this migration
-- adds the later uniqueness/index/created-by/update-at controls only.

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
  WITH CHECK (private.current_user_has_permission('projects','insert'));

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
SET search_path = public, pg_temp
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
SECURITY INVOKER
SET search_path = public, pg_temp
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
