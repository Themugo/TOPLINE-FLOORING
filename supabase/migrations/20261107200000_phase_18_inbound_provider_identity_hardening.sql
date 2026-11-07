-- Phase 18 — inbound provider-response integrity.
-- Every inbound message must carry a stable provider ID so retries cannot create
-- duplicate customer timeline entries or duplicate staff notifications.

CREATE OR REPLACE FUNCTION public.record_inbound_communication_worker(
  p_provider text,
  p_channel text,
  p_sender text,
  p_recipient text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_conversation_id text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id uuid;
  v_customer_id uuid;
  v_provider text := nullif(btrim(p_provider), '');
  v_channel text := lower(coalesce(p_channel, ''));
  v_sender text := nullif(btrim(p_sender), '');
  v_message text := nullif(btrim(p_message), '');
  v_provider_message_id text := nullif(btrim(p_provider_message_id), '');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF v_provider IS NULL OR length(v_provider) > 80 THEN
    RAISE EXCEPTION 'Valid provider is required';
  END IF;
  IF v_channel NOT IN ('email', 'sms', 'whatsapp') THEN
    RAISE EXCEPTION 'Invalid inbound channel';
  END IF;
  IF v_sender IS NULL OR length(v_sender) > 320 THEN
    RAISE EXCEPTION 'Valid inbound sender is required';
  END IF;
  IF v_message IS NULL OR length(v_message) > 262144 THEN
    RAISE EXCEPTION 'Inbound message is required and must not exceed 262144 characters';
  END IF;
  IF v_provider_message_id IS NULL OR length(v_provider_message_id) > 255 THEN
    RAISE EXCEPTION 'Stable provider message ID is required';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN
    RAISE EXCEPTION 'Inbound provider payload must be a JSON object';
  END IF;
  IF p_media_url IS NOT NULL AND length(p_media_url) > 2048 THEN
    RAISE EXCEPTION 'Inbound media URL is too long';
  END IF;

  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE (v_channel = 'email' AND lower(btrim(c.email)) = lower(v_sender))
     OR (v_channel IN ('sms', 'whatsapp') AND public.normalize_customer_phone(c.phone) = public.normalize_customer_phone(v_sender))
  ORDER BY c.created_at ASC, c.id ASC
  LIMIT 1;

  INSERT INTO public.communication_inbound(
    customer_id, channel, sender, recipient, subject, message, provider,
    provider_message_id, conversation_id, media_url, payload
  ) VALUES (
    v_customer_id, v_channel, v_sender, nullif(btrim(p_recipient), ''),
    nullif(btrim(p_subject), ''), v_message, v_provider,
    v_provider_message_id, nullif(btrim(p_conversation_id), ''),
    p_media_url, v_payload
  )
  ON CONFLICT (provider, channel, provider_message_id) DO NOTHING
  RETURNING id INTO v_id;

  -- A provider retry resolves to the existing row. Only the transaction that
  -- inserted the row may append the customer timeline and staff notification.
  IF v_id IS NULL THEN
    SELECT i.id INTO v_id
    FROM public.communication_inbound i
    WHERE i.provider = v_provider
      AND i.channel = v_channel
      AND i.provider_message_id = v_provider_message_id
    LIMIT 1;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Inbound provider event conflict could not be resolved';
    END IF;
    RETURN v_id;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    INSERT INTO public.customer_communications(
      customer_id, channel, direction, subject, message, status,
      external_reference, created_at
    ) VALUES (
      v_customer_id, v_channel, 'inbound', nullif(btrim(p_subject), ''),
      v_message, 'logged', v_provider_message_id, now()
    );
    INSERT INTO public.notification_events(
      event_type, entity_type, entity_id, customer_id, title, message,
      severity, audience, metadata
    ) VALUES (
      'communication.inbound', 'communication', v_id, v_customer_id,
      'Customer response received', left(v_message, 500), 'info', 'staff',
      jsonb_build_object('channel', v_channel, 'provider', v_provider, 'sender', v_sender)
    );
  END IF;

  UPDATE public.communication_inbound SET processed_at = now() WHERE id = v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb)
  TO service_role;
