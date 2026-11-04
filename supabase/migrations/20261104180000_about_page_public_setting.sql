-- The About page content (editable from Admin > About Page) is public website copy: allow-list its setting key.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated
  USING (setting_key IN ('custom_css','tax_settings','about_page'));
