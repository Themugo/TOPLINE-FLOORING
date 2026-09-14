CREATE TABLE IF NOT EXISTS public.site_content_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  content_key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(route, content_key)
);
CREATE INDEX IF NOT EXISTS idx_site_content_registry_route ON public.site_content_registry(route, is_active);
ALTER TABLE public.site_content_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_content_registry_public_read ON public.site_content_registry;
CREATE POLICY site_content_registry_public_read ON public.site_content_registry FOR SELECT TO anon, authenticated USING (is_active=true);
DROP POLICY IF EXISTS site_content_registry_staff_select ON public.site_content_registry;
CREATE POLICY site_content_registry_staff_select ON public.site_content_registry FOR SELECT TO authenticated USING (private.current_user_has_permission('content','select'));
DROP POLICY IF EXISTS site_content_registry_staff_insert ON public.site_content_registry;
CREATE POLICY site_content_registry_staff_insert ON public.site_content_registry FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('content','insert'));
DROP POLICY IF EXISTS site_content_registry_staff_update ON public.site_content_registry;
CREATE POLICY site_content_registry_staff_update ON public.site_content_registry FOR UPDATE TO authenticated USING (private.current_user_has_permission('content','update')) WITH CHECK (private.current_user_has_permission('content','update'));
DROP POLICY IF EXISTS site_content_registry_staff_delete ON public.site_content_registry;
CREATE POLICY site_content_registry_staff_delete ON public.site_content_registry FOR DELETE TO authenticated USING (private.current_user_has_permission('content','delete'));
GRANT SELECT ON public.site_content_registry TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content_registry TO authenticated;
CREATE OR REPLACE FUNCTION public.get_public_site_content(p_route text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT COALESCE(jsonb_object_agg(content_key,value),'{}'::jsonb) FROM public.site_content_registry WHERE route=lower(trim(p_route)) AND is_active=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_site_content(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_site_content(text) TO anon, authenticated;
