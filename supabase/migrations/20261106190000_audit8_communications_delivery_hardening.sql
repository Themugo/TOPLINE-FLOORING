-- Phase 8: Email, SMS and WhatsApp delivery callback hardening.
-- Provider references are not trusted as globally unique across channels/providers. Callback correlation must
-- remain inside the channel and provider boundary, and SMS delivery reports must also agree with the destination.

CREATE OR REPLACE FUNCTION public.record_provider_delivery_event_worker(
  p_provider text,
  p_channel text,
  p_event_type text,
  p_provider_message_id text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_recipient text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_outbox public.communication_outbox%ROWTYPE;
  v_status text := lower(coalesce(p_event_type,'unknown'));
  v_norm text := regexp_replace(lower(coalesce(p_event_type,'unknown')), '[^a-z]', '', 'g');
  v_delivery text;
  v_email text;
  v_reason text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid channel'; END IF;

  INSERT INTO public.communication_provider_events(provider,channel,event_type,provider_message_id,provider_reference,recipient,payload)
  VALUES(p_provider,p_channel,p_event_type,p_provider_message_id,p_provider_reference,p_recipient,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT DO NOTHING;

  IF p_channel = 'email' THEN
    v_reason := CASE
      WHEN v_norm = 'hardbounce' THEN 'hard_bounce'
      WHEN v_norm IN ('invalidemail','invalid') THEN 'invalid_email'
      WHEN v_norm IN ('spam','complaint') THEN 'spam_complaint'
      WHEN v_norm IN ('unsubscribed','unsubscribe') THEN 'unsubscribed'
      ELSE NULL END;
    v_email := lower(btrim(coalesce(nullif(p_recipient,''), p_payload->>'email', '')));
    IF v_reason IS NOT NULL AND v_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND length(v_email) <= 320 THEN
      INSERT INTO public.communication_suppressions AS s(email,reason,source,details)
      VALUES(v_email, v_reason, coalesce(p_provider,'provider') || '_webhook',
             jsonb_build_object('event', p_event_type, 'provider_message_id', p_provider_message_id))
      ON CONFLICT (email) DO UPDATE
        SET reason = CASE WHEN s.reason IN ('hard_bounce','invalid_email','spam_complaint') THEN s.reason ELSE EXCLUDED.reason END,
            details = EXCLUDED.details, updated_at = now();
      IF v_reason IN ('unsubscribed','spam_complaint','hard_bounce','invalid_email') THEN
        UPDATE public.customer_notification_preferences p
           SET marketing_email_enabled = false, updated_at = now()
          FROM public.customers c
         WHERE c.id = p.customer_id AND lower(btrim(c.email)) = v_email AND p.marketing_email_enabled;
        UPDATE public.brevo_marketing_sync_queue
           SET status = 'superseded', processed_at = now(), last_error = 'recipient suppressed: ' || v_reason
         WHERE email = v_email AND action = 'subscribe' AND status = 'queued';
      END IF;
    END IF;
  END IF;

  -- Provider references are scoped to the callback's channel and provider. A row whose provider has not yet
  -- been written is allowed for the narrow callback-before-completion race; it is still channel-bound.
  SELECT * INTO v_outbox
    FROM public.communication_outbox
   WHERE channel = p_channel
     AND (provider IS NULL OR lower(provider) = lower(coalesce(p_provider,'')))
     AND ((p_provider_message_id IS NOT NULL AND provider_message_id = p_provider_message_id)
       OR (p_provider_reference IS NOT NULL AND provider_reference = p_provider_reference))
   ORDER BY created_at DESC LIMIT 1;
  IF v_outbox.id IS NULL THEN RETURN false; END IF;

  v_delivery := CASE
    WHEN v_status IN ('delivered','success','read') THEN 'delivered'
    WHEN v_status IN ('sent','request','accepted','submitted','buffered') THEN v_status
    WHEN v_status IN ('failed','error','hardbounce','hard_bounce','softbounce','soft_bounce','rejected','blocked','spam','complaint','invalid','invalid_email','expired') THEN 'failed'
    ELSE 'unknown' END;
  PERFORM public.apply_communication_delivery_state_worker(
    v_outbox.id,p_provider,p_event_type,v_delivery,p_provider_message_id,p_provider_reference,coalesce(p_payload,'{}'::jsonb));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.record_sms_delivery_report(
  p_provider_reference text,
  p_status text,
  p_phone text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_cost numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_status text := lower(coalesce(p_status,'unknown'));
  v_delivery text;
  v_id uuid;
BEGIN
  IF v_status NOT IN ('sent','submitted','buffered','success','delivered','rejected','failed','expired') THEN v_status := 'unknown'; END IF;
  SELECT id INTO v_id
    FROM public.communication_outbox
   WHERE channel='sms'
     AND provider_reference=p_provider_reference
     AND (p_phone IS NULL OR public.normalize_customer_phone(recipient)=public.normalize_customer_phone(p_phone))
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  v_delivery := CASE
    WHEN v_status IN ('success','delivered') THEN 'delivered'
    WHEN v_status IN ('sent','submitted','buffered') THEN v_status
    WHEN v_status IN ('rejected','failed','expired') THEN v_status
    ELSE 'unknown' END;
  PERFORM public.apply_communication_delivery_state_worker(
    v_id,'africastalking',coalesce(p_status,'unknown'),v_delivery,NULL,p_provider_reference,coalesce(p_payload,'{}'::jsonb));
  UPDATE public.communication_outbox
     SET provider_payload=coalesce(p_payload,'{}'::jsonb),
         provider_cost=coalesce(p_cost,provider_cost),
         error_message=CASE WHEN v_delivery IN ('failed','rejected','expired') THEN nullif(trim(p_description),'') ELSE error_message END
   WHERE id=v_id;
  RETURN true;
END; $$;

COMMENT ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) IS
  'Service-role provider callback boundary; correlation is constrained by provider and channel before monotonic state application.';
COMMENT ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric) IS
  'Service-role SMS delivery report boundary; provider reference and normalized destination must match before monotonic state application.';
