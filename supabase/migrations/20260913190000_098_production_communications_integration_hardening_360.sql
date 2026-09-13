-- Production Communications Integration Hardening 360
-- Durable provider-attempt audit, safer provider correlation and explicit worker boundaries.

CREATE TABLE IF NOT EXISTS public.communication_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL REFERENCES public.communication_outbox(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  provider text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  request_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text NOT NULL DEFAULT 'started' CHECK (outcome IN ('started','accepted','delivered','failed','uncertain')),
  http_status integer,
  provider_reference text,
  error_message text,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(outbox_id, attempt_number),
  UNIQUE(request_id)
);

CREATE INDEX IF NOT EXISTS communication_delivery_attempts_outbox_idx
  ON public.communication_delivery_attempts(outbox_id, started_at DESC);
CREATE INDEX IF NOT EXISTS communication_delivery_attempts_provider_idx
  ON public.communication_delivery_attempts(provider, channel, outcome, started_at DESC);

ALTER TABLE public.communication_delivery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_delivery_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_communication_delivery_attempt_worker(
  p_outbox_id uuid,
  p_attempt_number integer,
  p_provider text,
  p_channel text,
  p_request_id uuid,
  p_outcome text DEFAULT 'started',
  p_http_status integer DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_response_payload jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_id uuid;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF p_attempt_number < 1 THEN RAISE EXCEPTION 'Invalid attempt number'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid channel'; END IF;
  IF p_outcome NOT IN ('started','accepted','delivered','failed','uncertain') THEN RAISE EXCEPTION 'Invalid attempt outcome'; END IF;

  INSERT INTO public.communication_delivery_attempts(
    outbox_id,attempt_number,provider,channel,request_id,outcome,http_status,
    provider_reference,error_message,response_payload,completed_at
  )
  VALUES(
    p_outbox_id,p_attempt_number,trim(p_provider),p_channel,p_request_id,p_outcome,
    p_http_status,nullif(trim(p_provider_reference),''),nullif(trim(p_error_message),''),
    coalesce(p_response_payload,'{}'::jsonb),
    CASE WHEN p_outcome='started' THEN NULL ELSE now() END
  )
  ON CONFLICT (outbox_id,attempt_number) DO UPDATE SET
    provider=EXCLUDED.provider,
    channel=EXCLUDED.channel,
    request_id=EXCLUDED.request_id,
    outcome=EXCLUDED.outcome,
    http_status=EXCLUDED.http_status,
    provider_reference=EXCLUDED.provider_reference,
    error_message=EXCLUDED.error_message,
    response_payload=EXCLUDED.response_payload,
    completed_at=EXCLUDED.completed_at
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.record_communication_delivery_attempt_worker(uuid,integer,text,text,uuid,text,integer,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_communication_delivery_attempt_worker(uuid,integer,text,text,uuid,text,integer,text,text,jsonb) TO service_role;

-- Provider event normalization: Brevo's transactional event names and request/accepted states
-- are mapped into the durable delivery state model without discarding the raw event.
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
  v_delivery text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid channel'; END IF;

  INSERT INTO public.communication_provider_events(provider,channel,event_type,provider_message_id,provider_reference,recipient,payload)
  VALUES(p_provider,p_channel,p_event_type,p_provider_message_id,p_provider_reference,p_recipient,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_outbox
  FROM public.communication_outbox
  WHERE (p_provider_message_id IS NOT NULL AND provider_message_id=p_provider_message_id)
     OR (p_provider_reference IS NOT NULL AND provider_reference=p_provider_reference)
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;

  IF v_outbox.id IS NULL THEN RETURN false; END IF;

  v_delivery := CASE
    WHEN v_status IN ('delivered','success') THEN 'delivered'
    WHEN v_status IN ('sent','request','accepted','submitted','buffered') THEN v_status
    WHEN v_status IN ('failed','error','hardbounce','hard_bounce','softbounce','soft_bounce','rejected','blocked','spam','invalid','expired') THEN 'failed'
    ELSE 'unknown'
  END;

  UPDATE public.communication_outbox
  SET delivery_status=v_delivery,
      delivered_at=CASE WHEN v_delivery='delivered' THEN coalesce(delivered_at,now()) ELSE delivered_at END,
      last_provider_event=p_event_type,
      last_provider_event_at=now(),
      provider_payload=coalesce(p_payload,'{}'::jsonb),
      error_message=CASE WHEN v_delivery='failed' THEN coalesce(nullif(p_payload->>'reason',''),nullif(p_payload->>'error',''),error_message) ELSE error_message END
  WHERE id=v_outbox.id;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) TO service_role;

COMMENT ON TABLE public.communication_delivery_attempts IS 'Immutable operational trail for provider delivery attempts; service-role worker access only.';
COMMENT ON TABLE public.communication_provider_events IS 'Idempotent provider delivery/event audit stream; raw provider event is retained.';

CREATE OR REPLACE FUNCTION public.mark_communication_delivery_uncertain_worker(
  p_outbox_id uuid,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  UPDATE public.communication_outbox
  SET status='failed',
      delivery_status='unknown',
      locked_at=NULL,
      error_message=left(coalesce(nullif(trim(p_error_message),''),'Provider accepted message but local completion failed'),1000)
  WHERE id=p_outbox_id AND status='queued';
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.mark_communication_delivery_uncertain_worker(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_communication_delivery_uncertain_worker(uuid,text) TO service_role;
