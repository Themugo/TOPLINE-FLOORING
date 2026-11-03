-- Domain change: toplineflooringandwaterproofing.co.ke -> toplinefloorandwaterproofing.co.ke.
-- Redefines the site URL helper used in customer/staff emails and updates the non-secret
-- sender / reply-to defaults on the email integration rows. Earlier migrations are left untouched.

CREATE OR REPLACE FUNCTION private.topline_site_url()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 'https://toplinefloorandwaterproofing.co.ke'::text $$;
REVOKE ALL ON FUNCTION private.topline_site_url() FROM PUBLIC, anon, authenticated;

UPDATE public.site_integration_configs
SET public_config = public_config
      || jsonb_build_object(
           'sender_email','no-reply@toplinefloorandwaterproofing.co.ke',
           'reply_to_email','support@toplinefloorandwaterproofing.co.ke'),
    updated_at = now()
WHERE integration_key IN ('communications.email','communications.email.auth')
  AND (public_config->>'sender_email' LIKE '%@toplineflooringandwaterproofing.co.ke'
       OR public_config->>'reply_to_email' LIKE '%@toplineflooringandwaterproofing.co.ke');
