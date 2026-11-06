-- Phase 12 regression hardening.
-- The Phase 11 storage policy repair targets storage.objects; make the RLS
-- posture explicit in the ordered migration stream for fresh replays and
-- static migration-contract validation.

ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Replace the previously published misspelling in live CMS/contact records
-- without overwriting an administrator's intentionally different address.
UPDATE public.site_settings
SET setting_value = jsonb_set(setting_value, '{contact,email}', to_jsonb('toplineflooringandwaterproofing@gmail.com'::text), true),
    updated_at = now()
WHERE setting_key = 'website_settings'
  AND setting_value #>> '{contact,email}' = 'toplineflooringandwaterproofin@gmail.com';

UPDATE public.site_settings
SET setting_value = jsonb_set(setting_value, '{email}', to_jsonb('toplineflooringandwaterproofing@gmail.com'::text), true),
    updated_at = now()
WHERE setting_key = 'contact'
  AND setting_value #>> '{email}' = 'toplineflooringandwaterproofin@gmail.com';

UPDATE public.cms_content
SET content = jsonb_set(content, '{email}', to_jsonb('toplineflooringandwaterproofing@gmail.com'::text), true),
    updated_at = now()
WHERE page IN ('contact', 'footer')
  AND content->>'email' = 'toplineflooringandwaterproofin@gmail.com';
