-- TOPLINE runtime hardening applied to dedicated Supabase project.
-- Kept outside supabase/migrations because the live canonical migration ledger remains 88.
-- This is an idempotent operational hardening script for environments that need the same fix.

GRANT SELECT ON public.site_design_tokens TO anon, authenticated;
DROP POLICY IF EXISTS site_design_tokens_public_read ON public.site_design_tokens;
CREATE POLICY site_design_tokens_public_read
  ON public.site_design_tokens
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

GRANT SELECT ON public.site_settings TO anon, authenticated;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read
  ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);
