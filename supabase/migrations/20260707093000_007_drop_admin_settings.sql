/*
# Remove Leftover admin_settings Table

Context
-------
`admin_settings` originally served two purposes:
  1. Storing the admin username/password in plain text (removed in
     migration 006 - auth is now real Supabase Auth).
  2. Storing basic site info / contact fields (site_name, site_tagline,
     contact_email, contact_phone, contact_address, business_hours) that
     duplicated the richer, structured `site_settings` table already used
     by the Admin -> Site Settings page.

No frontend code reads or writes `admin_settings` anymore. This migration
carries over the still-useful values into `site_settings` (so nothing is
silently lost) and then drops the table entirely, leaving `site_settings`
as the single source of truth for site/contact info.

Note: `business_hours` was a single free-text string here
(e.g. "Mon-Fri: 8AM-5PM, Sat: 9AM-1PM") but `site_settings.business_hours`
expects structured { weekdays: {open, close}, saturday: {...}, sunday }.
Automatically parsing that string reliably isn't safe, so it is not
migrated - just re-enter your hours once on the Site Settings page after
this runs.
*/

-- Carry over site_info fields, merging into any existing site_settings row
DO $$
DECLARE
  v_name text;
  v_tagline text;
BEGIN
  SELECT setting_value INTO v_name FROM admin_settings WHERE setting_key = 'site_name';
  SELECT setting_value INTO v_tagline FROM admin_settings WHERE setting_key = 'site_tagline';

  IF v_name IS NOT NULL OR v_tagline IS NOT NULL THEN
    INSERT INTO site_settings (setting_key, setting_value)
    VALUES (
      'site_info',
      jsonb_build_object('name', COALESCE(v_name, ''), 'tagline', COALESCE(v_tagline, ''))
    )
    ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = site_settings.setting_value
        || jsonb_strip_nulls(jsonb_build_object('name', v_name, 'tagline', v_tagline)),
          updated_at = now();
  END IF;
END $$;

-- Carry over contact fields
DO $$
DECLARE
  v_email text;
  v_phone text;
  v_address text;
  v_whatsapp text;
BEGIN
  SELECT setting_value INTO v_email FROM admin_settings WHERE setting_key = 'contact_email';
  SELECT setting_value INTO v_phone FROM admin_settings WHERE setting_key = 'contact_phone';
  SELECT setting_value INTO v_address FROM admin_settings WHERE setting_key = 'contact_address';
  SELECT setting_value INTO v_whatsapp FROM admin_settings WHERE setting_key = 'whatsapp_number';

  IF v_email IS NOT NULL OR v_phone IS NOT NULL OR v_address IS NOT NULL OR v_whatsapp IS NOT NULL THEN
    INSERT INTO site_settings (setting_key, setting_value)
    VALUES (
      'contact',
      jsonb_build_object(
        'email', COALESCE(v_email, ''),
        'phone', COALESCE(v_phone, ''),
        'address', COALESCE(v_address, ''),
        'whatsapp', COALESCE(v_whatsapp, '')
      )
    )
    ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = site_settings.setting_value
        || jsonb_strip_nulls(jsonb_build_object(
             'email', v_email, 'phone', v_phone, 'address', v_address, 'whatsapp', v_whatsapp
           )),
          updated_at = now();
  END IF;
END $$;

-- admin_settings is now fully unused - drop it
DROP TABLE IF EXISTS admin_settings;

-- is_admin() from migration 006 no longer has any table to reference,
-- but it's still a valid, harmless helper (auth.role() = 'authenticated'),
-- so it's left in place in case future policies want to use it.
