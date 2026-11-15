-- Visitors saw hard-coded defaults (wrong contact email, phone, WhatsApp, social links, hours, brand and page content)
-- while staff saw what they had saved. Migration 20261016150000 narrowed anonymous reads of site_settings to a
-- deliberate allow-list, and later migrations only added tax_settings and about_page, so the public contact/brand/
-- content rows became staff-only and the website silently fell back to its built-in defaults.
--
-- This adds the keys the public website genuinely needs. Each holds information that is already shown publicly:
--   Admin > Site Settings : site_info, contact (public email/phone/address), social_links, business_hours, footer
--   CMS content groups    : website_settings, homepage, about, services, projects, gallery, testimonials, faq, seo, theme_settings
-- Deliberately NOT exposed: company (registration/tax identifiers), media_library, seo_defaults, legacy logo/favicon
-- rows, and any key not listed here. Writes stay staff-only through the existing RBAC policies.

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated
  USING (setting_key IN (
    'custom_css', 'tax_settings', 'about_page',
    'site_info', 'contact', 'social', 'social_links', 'business_hours', 'footer',
    'website_settings', 'homepage', 'about', 'services', 'projects', 'gallery', 'testimonials', 'faq', 'seo', 'theme_settings'
  ));
COMMENT ON POLICY site_settings_public_read ON public.site_settings IS
  'Browser roles may read only allow-listed public settings (contact details, brand, public page content, tax display). Add a key here deliberately; never expose the whole table.';
