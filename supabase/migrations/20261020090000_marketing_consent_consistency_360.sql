-- TOPLINE 2026-10-20 end-to-end audit: marketing consent must be consistent between registration, the customer
-- portal and the Brevo list.
--
-- Defect reproduced against the real worker and a database built from every migration:
--  1. A customer who registered WITH marketing consent and verified their email was queued for Brevo, but no
--     customer_notification_preferences row was created. The portal therefore showed marketing as OFF while the
--     customer was (or was about to be) subscribed at Brevo.
--  2. When that customer then "turned marketing off" the portal saved a first-ever preference row with
--     marketing_email_enabled = false. The trigger treated an INSERT with false as "nothing to do", so no
--     unsubscribe was queued and the pending subscribe was still delivered. An explicit opt-out was ignored.
-- This migration makes the verified registration opt-in create the preference record, makes an explicit opt-out
-- effective even when it is the first preference row, and repairs existing accounts in either state.

-- A. Explicit opt-out is always honoured; a first-time "off" matters when the address is already subscribed or queued.
CREATE OR REPLACE FUNCTION public.enqueue_brevo_marketing_sync_on_preference_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_email text;
  v_enabled boolean := coalesce(NEW.marketing_email_enabled, false);
BEGIN
  IF TG_OP = 'UPDATE' AND v_enabled IS NOT DISTINCT FROM coalesce(OLD.marketing_email_enabled, false) THEN
    RETURN NEW;
  END IF;

  SELECT lower(trim(c.email)) INTO v_email FROM public.customers c WHERE c.id = NEW.customer_id;
  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;

  IF v_enabled THEN
    IF TG_OP = 'INSERT' THEN
      NEW.marketing_email_consent_at := coalesce(NEW.marketing_email_consent_at, now());
      NEW.marketing_email_consent_source := coalesce(NEW.marketing_email_consent_source, 'customer_portal');
    ELSE
      NEW.marketing_email_consent_at := now();
      -- Keep a source supplied by the caller (for example the registration form); otherwise it is the portal.
      IF NEW.marketing_email_consent_source IS NOT DISTINCT FROM OLD.marketing_email_consent_source THEN
        NEW.marketing_email_consent_source := 'customer_portal';
      END IF;
    END IF;
    -- A fresh explicit opt-in clears an earlier unsubscribe, but never overrides a bounce or complaint.
    DELETE FROM public.communication_suppressions WHERE email = v_email AND reason = 'unsubscribed';
    IF EXISTS (SELECT 1 FROM public.communication_suppressions WHERE email = v_email) THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- First preference row saved as "off". Nothing to undo unless this address was already subscribed or queued.
    IF NOT EXISTS (
      SELECT 1 FROM public.brevo_marketing_sync_queue q
       WHERE q.email = v_email AND q.action = 'subscribe' AND q.status IN ('queued', 'processing', 'synced')
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  UPDATE public.brevo_marketing_sync_queue
     SET status = 'superseded', processed_at = now(), last_error = 'superseded by a newer preference change'
   WHERE email = v_email AND status = 'queued';

  INSERT INTO public.brevo_marketing_sync_queue(customer_id, auth_user_id, email, action, dedupe_key, consent_at, consent_source)
  VALUES (NEW.customer_id, NULL, v_email, CASE WHEN v_enabled THEN 'subscribe' ELSE 'unsubscribe' END,
          'preference:' || NEW.customer_id::text || ':' || gen_random_uuid()::text,
          coalesce(NEW.marketing_email_consent_at, now()), coalesce(NEW.marketing_email_consent_source, 'customer_portal'))
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_brevo_marketing_sync_on_preference_change() FROM PUBLIC, anon, authenticated;

-- B. A verified registration opt-in records the consent in the customer's preferences (which the portal reads) and
--    lets the preference trigger queue the subscribe. If the account is not linked to a customer record yet, the
--    subscribe is queued directly as before.
CREATE OR REPLACE FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_email text;
  v_opt_in boolean;
  v_customer uuid;
BEGIN
  -- Only subscribe after the email address is verified.
  IF TG_OP = 'INSERT' THEN
    IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  ELSE
    IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  END IF;

  v_email := lower(trim(coalesce(NEW.email, '')));
  v_opt_in := lower(coalesce(NEW.raw_user_meta_data->>'marketing_email_opt_in', 'false')) IN ('true', '1', 'yes');
  IF NOT v_opt_in OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;

  DELETE FROM public.communication_suppressions WHERE email = v_email AND reason = 'unsubscribed';
  IF EXISTS (SELECT 1 FROM public.communication_suppressions WHERE email = v_email) THEN RETURN NEW; END IF;

  SELECT pa.customer_id INTO v_customer
    FROM public.customer_portal_access pa
   WHERE pa.auth_user_id = NEW.id AND pa.customer_id IS NOT NULL AND pa.is_active
   ORDER BY pa.created_at LIMIT 1;

  IF v_customer IS NOT NULL THEN
    INSERT INTO public.customer_notification_preferences(customer_id, marketing_email_enabled, marketing_email_consent_at, marketing_email_consent_source)
    VALUES (v_customer, true, now(), 'customer_registration_form')
    ON CONFLICT (customer_id) DO UPDATE
      SET marketing_email_enabled = true,
          marketing_email_consent_at = now(),
          marketing_email_consent_source = 'customer_registration_form',
          updated_at = now();
    RETURN NEW;
  END IF;

  UPDATE public.brevo_marketing_sync_queue
     SET status = 'superseded', processed_at = now(), last_error = 'superseded by a newer registration opt-in'
   WHERE email = v_email AND status = 'queued';

  INSERT INTO public.brevo_marketing_sync_queue(customer_id, auth_user_id, email, action, dedupe_key, consent_at, consent_source)
  VALUES (NULL, NEW.id, v_email, 'subscribe', 'auth-signup:' || NEW.id::text, now(), 'customer_registration_form')
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup() FROM PUBLIC, anon, authenticated;

-- C. Repair existing accounts.
-- C1. Opted in at registration but no preference record: record the consent the portal should show. The preference
--     trigger is paused for this statement only, because Brevo was already told to subscribe these addresses.
ALTER TABLE public.customer_notification_preferences DISABLE TRIGGER trg_brevo_marketing_sync_on_preference_change;

INSERT INTO public.customer_notification_preferences(customer_id, marketing_email_enabled, marketing_email_consent_at, marketing_email_consent_source)
SELECT DISTINCT ON (pa.customer_id) pa.customer_id, true, coalesce(q.consent_at, q.created_at), 'customer_registration_form'
  FROM public.brevo_marketing_sync_queue q
  JOIN public.customer_portal_access pa ON pa.auth_user_id = q.auth_user_id AND pa.customer_id IS NOT NULL AND pa.is_active
 WHERE q.action = 'subscribe' AND q.consent_source = 'customer_registration_form'
   AND q.status IN ('queued', 'processing', 'synced')
   AND NOT EXISTS (SELECT 1 FROM public.customer_notification_preferences p WHERE p.customer_id = pa.customer_id)
   AND NOT EXISTS (SELECT 1 FROM public.brevo_marketing_sync_queue u WHERE u.email = q.email AND u.action = 'unsubscribe' AND u.created_at > q.created_at)
 ORDER BY pa.customer_id, q.created_at DESC;

ALTER TABLE public.customer_notification_preferences ENABLE TRIGGER trg_brevo_marketing_sync_on_preference_change;

-- C2. Opted out in the portal AFTER being subscribed, but no unsubscribe was ever queued (the defect above):
--     queue the unsubscribe now so the customer stops receiving marketing.
INSERT INTO public.brevo_marketing_sync_queue(customer_id, auth_user_id, email, action, dedupe_key, consent_at, consent_source)
SELECT p.customer_id, NULL, lower(trim(c.email)), 'unsubscribe', 'consent-repair:' || p.customer_id::text,
       p.updated_at, 'consent_repair_2026_10_20'
  FROM public.customer_notification_preferences p
  JOIN public.customers c ON c.id = p.customer_id
 WHERE NOT coalesce(p.marketing_email_enabled, false)
   AND lower(trim(c.email)) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   AND EXISTS (SELECT 1 FROM public.brevo_marketing_sync_queue s
                WHERE s.email = lower(trim(c.email)) AND s.action = 'subscribe' AND s.status IN ('queued', 'processing', 'synced')
                  AND s.created_at < p.updated_at)
   AND NOT EXISTS (SELECT 1 FROM public.brevo_marketing_sync_queue u
                    WHERE u.email = lower(trim(c.email)) AND u.action = 'unsubscribe' AND u.status <> 'superseded'
                      AND u.created_at >= p.updated_at - interval '1 minute')
ON CONFLICT (dedupe_key) DO NOTHING;
