-- TOPLINE email closure sweep: quotation notifications + consent-gated Brevo marketing list sync.
-- No provider secrets are stored in the database. Transactional messages use the existing outbox.

ALTER TABLE public.customer_notification_preferences
  ADD COLUMN IF NOT EXISTS marketing_email_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_email_consent_source text;

CREATE TABLE IF NOT EXISTS public.brevo_marketing_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  action text NOT NULL CHECK (action IN ('subscribe','unsubscribe')),
  dedupe_key text UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','synced','failed')),
  consent_at timestamptz,
  consent_source text,
  CONSTRAINT brevo_marketing_sync_owner_check CHECK ((customer_id IS NOT NULL) <> (auth_user_id IS NOT NULL)),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS brevo_marketing_sync_queue_ready_idx
  ON public.brevo_marketing_sync_queue(status,next_attempt_at,created_at);
ALTER TABLE public.brevo_marketing_sync_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.brevo_marketing_sync_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.brevo_marketing_sync_queue TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_brevo_marketing_sync_on_preference_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_email text;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NOT coalesce(NEW.marketing_email_enabled,false) THEN RETURN NEW; END IF;
    NEW.marketing_email_consent_at := coalesce(NEW.marketing_email_consent_at,now());
    NEW.marketing_email_consent_source := coalesce(NEW.marketing_email_consent_source,'customer_portal');
  ELSIF NEW.marketing_email_enabled IS NOT DISTINCT FROM OLD.marketing_email_enabled THEN
    RETURN NEW;
  ELSIF NEW.marketing_email_enabled THEN
    NEW.marketing_email_consent_at := now();
    NEW.marketing_email_consent_source := 'customer_portal';
  END IF;

  SELECT lower(trim(c.email)) INTO v_email FROM public.customers c WHERE c.id=NEW.customer_id;
  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;

  INSERT INTO public.brevo_marketing_sync_queue(customer_id,auth_user_id,email,action,dedupe_key,consent_at,consent_source)
  VALUES(NEW.customer_id,NULL,v_email,CASE WHEN NEW.marketing_email_enabled THEN 'subscribe' ELSE 'unsubscribe' END, 'preference:'||NEW.customer_id::text||':'||gen_random_uuid()::text,NEW.marketing_email_consent_at,NEW.marketing_email_consent_source)
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_brevo_marketing_sync_on_preference_change ON public.customer_notification_preferences;
CREATE TRIGGER trg_brevo_marketing_sync_on_preference_change
BEFORE INSERT OR UPDATE OF marketing_email_enabled ON public.customer_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.enqueue_brevo_marketing_sync_on_preference_change();

-- Existing true preferences are prior explicit opt-ins (the preference defaults false).
-- Preserve that consent state and enqueue a one-time, idempotent list sync.
UPDATE public.customer_notification_preferences
SET marketing_email_consent_at=coalesce(marketing_email_consent_at,updated_at,now()),
    marketing_email_consent_source=coalesce(marketing_email_consent_source,'customer_portal_existing_preference')
WHERE marketing_email_enabled=true;
INSERT INTO public.brevo_marketing_sync_queue(customer_id,auth_user_id,email,action,dedupe_key,consent_at,consent_source)
SELECT p.customer_id,NULL::uuid,lower(trim(c.email)),'subscribe','backfill:'||p.customer_id::text,p.marketing_email_consent_at,p.marketing_email_consent_source
FROM public.customer_notification_preferences p
JOIN public.customers c ON c.id=p.customer_id
WHERE p.marketing_email_enabled=true
  AND lower(trim(coalesce(c.email,''))) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
ON CONFLICT (dedupe_key) DO NOTHING;

-- New customer account registrations may opt into marketing explicitly. A normal
-- registration or a quotation request never subscribes an address automatically.
CREATE OR REPLACE FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_email text; v_opt_in boolean;
BEGIN
  -- Only subscribe after the email address is verified. If email confirmation is
  -- disabled, an already-confirmed insert is still eligible. Unverified signups
  -- keep the opt-in in Auth metadata until the confirmation transition occurs.
  IF TG_OP = 'INSERT' THEN
    IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  ELSE
    IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  END IF;

  v_email := lower(trim(coalesce(NEW.email,'')));
  v_opt_in := lower(coalesce(NEW.raw_user_meta_data->>'marketing_email_opt_in','false')) IN ('true','1','yes');
  IF NOT v_opt_in OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;

  INSERT INTO public.brevo_marketing_sync_queue(
    customer_id,auth_user_id,email,action,dedupe_key,consent_at,consent_source
  ) VALUES (
    NULL,NEW.id,v_email,'subscribe','auth-signup:'||NEW.id::text,now(),'customer_registration_form'
  ) ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_brevo_marketing_sync_on_auth_signup_insert ON auth.users;
DROP TRIGGER IF EXISTS trg_brevo_marketing_sync_on_auth_signup_verify ON auth.users;
CREATE TRIGGER trg_brevo_marketing_sync_on_auth_signup_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup();
CREATE TRIGGER trg_brevo_marketing_sync_on_auth_signup_verify
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup();

-- Queue two transactional messages for every newly saved public quotation request.
-- Admin destination is configurable in communications.email public_config. If not set,
-- use the CMS contact email. The customer acknowledgement never doubles as marketing consent.
CREATE OR REPLACE FUNCTION public.queue_quotation_intake_emails()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_admin_email text;
  v_ref text;
  v_customer_message text;
  v_admin_message text;
BEGIN
  SELECT nullif(lower(trim(ic.public_config->>'quotation_admin_email')),'')
    INTO v_admin_email
  FROM public.site_integration_configs ic
  WHERE ic.integration_key='communications.email';

  IF v_admin_email IS NULL THEN
    SELECT nullif(lower(trim(cc.content->>'email')),'') INTO v_admin_email
    FROM public.cms_content cc WHERE cc.page='contact' AND cc.section='info' LIMIT 1;
  END IF;
  IF v_admin_email IS NULL THEN
    SELECT nullif(lower(trim(cc.content->>'email')),'') INTO v_admin_email
    FROM public.cms_content cc WHERE cc.page='footer' AND cc.section='contact' LIMIT 1;
  END IF;
  IF v_admin_email IS NOT NULL AND v_admin_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    v_admin_email := NULL;
  END IF;

  v_ref := 'RFQ-' || upper(substr(replace(NEW.id::text,'-',''),1,8));
  v_customer_message := format(
    'Hello %s,\n\nWe have received your quotation request (%s). Our team will review the project details and contact you using the details you supplied.\n\nProject: %s\nLocation: %s\n\nThis is a transactional acknowledgement, not a marketing subscription.\n\nTopline Flooring & Waterproofing',
    NEW.name,v_ref,coalesce(NEW.project_type,NEW.service,'Not specified'),coalesce(NEW.county,NEW.location,'Not specified'));
  v_admin_message := format(
    'A new website quotation request was received.\n\nReference: %s\nName: %s\nEmail: %s\nPhone: %s\nCompany: %s\nProject: %s\nLocation: %s\nTimeline: %s\nBudget range: %s\n\nMessage/details:\n%s\n\nOpen the Topline admin dashboard to review and assign follow-up.',
    v_ref,NEW.name,NEW.email,NEW.phone,coalesce(NEW.company,'Not provided'),coalesce(NEW.project_type,NEW.service,'Not specified'),coalesce(NEW.county,NEW.location,'Not specified'),coalesce(NEW.timeline,'Not provided'),coalesce(NEW.budget_range,'Not provided'),coalesce(NEW.message,'Not provided'));

  -- Keep an admin-visible durable notification even when the admin email
  -- destination has not yet been configured. Email UAT remains a release gate.
  INSERT INTO public.notification_events(event_type,entity_type,entity_id,title,message,severity,audience,metadata)
  VALUES('quotation.received','quotation',NEW.id,'New quotation request',v_admin_message,'info','staff',
    jsonb_build_object('quotation_id',NEW.id,'reference',v_ref,'admin_email_queued',v_admin_email IS NOT NULL));

  IF nullif(trim(NEW.email),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(NULL,'email',lower(trim(NEW.email)),'We received your Topline quotation request ('||v_ref||')',v_customer_message,'quotation-intake:'||NEW.id::text||':customer')
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  IF v_admin_email IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(NULL,'email',v_admin_email,'New Topline quotation request ('||v_ref||')',v_admin_message,'quotation-intake:'||NEW.id::text||':admin')
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_queue_quotation_intake_emails ON public.quotations;
CREATE TRIGGER trg_queue_quotation_intake_emails
AFTER INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.queue_quotation_intake_emails();

COMMENT ON TABLE public.brevo_marketing_sync_queue IS 'Durable, consent-gated sync queue for customer preferences and explicit Auth registration opt-ins to a configured Brevo list. Never populate from quotation-only or ordinary registration email addresses.';
COMMENT ON FUNCTION public.queue_quotation_intake_emails() IS 'Queues an admin RFQ alert and customer transactional acknowledgement through communication_outbox and a durable staff notification; does not subscribe the requester to marketing.';
COMMENT ON FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup() IS 'Queues a Brevo subscription only when the registration form records an explicit marketing_email_opt_in=true consent.';
