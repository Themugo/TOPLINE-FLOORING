-- Communications Provider + Response 360
-- End-to-end database wiring for email, SMS, WhatsApp outbound delivery,
-- provider callbacks, inbound customer responses and auditable timelines.

ALTER TABLE public.communication_outbox
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS last_provider_event text,
  ADD COLUMN IF NOT EXISTS last_provider_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS communication_outbox_provider_message_idx
  ON public.communication_outbox(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.communication_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  event_type text NOT NULL,
  provider_message_id text,
  provider_reference text,
  recipient text,
  payload jsonb NOT NULL DEFAULT '{}',
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, channel, event_type, provider_message_id, received_at)
);
CREATE INDEX IF NOT EXISTS communication_provider_events_lookup_idx
  ON public.communication_provider_events(provider, channel, provider_message_id, received_at DESC);
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT true;
UPDATE public.notification_rules SET whatsapp_enabled=true WHERE whatsapp_enabled IS DISTINCT FROM true;

CREATE UNIQUE INDEX IF NOT EXISTS communication_provider_events_message_uidx
  ON public.communication_provider_events(provider, channel, event_type, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
ALTER TABLE public.communication_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_provider_events FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.communication_inbound (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  sender text NOT NULL,
  recipient text,
  subject text,
  message text NOT NULL,
  provider text NOT NULL,
  provider_message_id text,
  conversation_id text,
  media_url text,
  payload jsonb NOT NULL DEFAULT '{}',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(provider, channel, provider_message_id)
);
CREATE INDEX IF NOT EXISTS communication_inbound_customer_idx
  ON public.communication_inbound(customer_id, received_at DESC);
CREATE INDEX IF NOT EXISTS communication_inbound_sender_idx
  ON public.communication_inbound(channel, sender, received_at DESC);
ALTER TABLE public.communication_inbound ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_inbound FROM anon;
GRANT SELECT ON public.communication_inbound TO authenticated;
DROP POLICY IF EXISTS communication_inbound_staff_read ON public.communication_inbound;
CREATE POLICY communication_inbound_staff_read ON public.communication_inbound
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('customers','read'));

CREATE OR REPLACE FUNCTION public.complete_communication_delivery_worker(
  p_outbox_id uuid,
  p_provider text,
  p_provider_reference text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  UPDATE public.communication_outbox
  SET status='sent',
      provider=nullif(trim(p_provider),''),
      provider_reference=nullif(trim(p_provider_reference),''),
      provider_message_id=nullif(trim(p_provider_message_id),''),
      delivery_status='accepted',
      sent_at=now(),
      locked_at=NULL,
      error_message=NULL
  WHERE id=p_outbox_id AND status='queued';
  IF NOT FOUND THEN RAISE EXCEPTION 'Queued message not found'; END IF;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text,text) TO service_role;

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
    WHEN v_status IN ('sent','accepted','submitted','buffered') THEN v_status
    WHEN v_status IN ('failed','error','hardbounce','hard_bounce','softbounce','soft_bounce','rejected','blocked','invalid','expired') THEN 'failed'
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_id uuid;
  v_customer_id uuid;
  v_normalized text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid inbound channel'; END IF;
  IF nullif(trim(coalesce(p_sender,'')),'') IS NULL OR nullif(trim(coalesce(p_message,'')),'') IS NULL THEN RAISE EXCEPTION 'Inbound sender and message are required'; END IF;

  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE (p_channel='email' AND lower(email)=lower(trim(p_sender)))
     OR (p_channel IN ('sms','whatsapp') AND public.normalize_customer_phone(phone)=public.normalize_customer_phone(p_sender))
  ORDER BY created_at ASC LIMIT 1;

  INSERT INTO public.communication_inbound(customer_id,channel,sender,recipient,subject,message,provider,provider_message_id,conversation_id,media_url,payload)
  VALUES(v_customer_id,p_channel,trim(p_sender),nullif(trim(p_recipient),''),nullif(trim(p_subject),''),trim(p_message),p_provider,p_provider_message_id,p_conversation_id,p_media_url,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT (provider,channel,provider_message_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_provider_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.communication_inbound WHERE provider=p_provider AND channel=p_channel AND provider_message_id=p_provider_message_id LIMIT 1;
  END IF;

  IF v_customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.communication_inbound WHERE id=v_id AND processed_at IS NULL) THEN
    INSERT INTO public.customer_communications(customer_id,channel,direction,subject,message,status,external_reference,created_at)
    VALUES(v_customer_id,p_channel,'inbound',nullif(trim(p_subject),''),trim(p_message),'logged',coalesce(p_provider_message_id,p_conversation_id),now());
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound','communication',v_id,v_customer_id,'Customer response received',left(trim(p_message),500),'info','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender));
  END IF;

  UPDATE public.communication_inbound SET processed_at=now() WHERE id=v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.get_customer_communications_360(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  RETURN jsonb_build_object(
    'outbound', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC) FROM public.communication_outbox o WHERE o.customer_id=p_customer_id),'[]'::jsonb),
    'inbound', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.received_at DESC) FROM public.communication_inbound i WHERE i.customer_id=p_customer_id),'[]'::jsonb),
    'timeline', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC) FROM public.customer_communications c WHERE c.customer_id=p_customer_id),'[]'::jsonb)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_customer_communications_360(uuid) TO authenticated;

-- Replace the earlier notification router with full email/SMS/WhatsApp preference support.
CREATE OR REPLACE FUNCTION public.queue_customer_notification_for_event(
  p_event_type text,
  p_entity_id uuid,
  p_customer_id uuid,
  p_status text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  r public.notification_rules%ROWTYPE;
  pref public.customer_notification_preferences%ROWTYPE;
  c public.customers%ROWTYPE;
  v_message text; v_subject text; v_recipient text; v_count integer:=0; v_dedupe text;
BEGIN
  SELECT * INTO r FROM public.notification_rules WHERE event_type=p_event_type AND enabled;
  IF NOT FOUND OR p_customer_id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO c FROM public.customers WHERE id=p_customer_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  INSERT INTO public.customer_notification_preferences(customer_id) VALUES(p_customer_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM public.customer_notification_preferences WHERE customer_id=p_customer_id;
  v_subject:=replace(r.subject_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(r.message_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(v_message,'{{customer_name}}',coalesce(c.name,'Customer'));

  IF r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN
    v_dedupe:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':email';
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'email',trim(c.email),v_subject,v_message,v_dedupe) ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    v_dedupe:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':sms';
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,message,dedupe_key)
    VALUES(p_customer_id,'sms',public.normalize_customer_phone(c.phone),v_message,v_dedupe) ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    v_dedupe:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':whatsapp';
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'whatsapp',public.normalize_customer_phone(c.phone),v_subject,v_message,v_dedupe) ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.queue_customer_notification_for_event(text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_communication_operations_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  RETURN jsonb_build_object(
    'queued',(SELECT count(*) FROM public.communication_outbox WHERE status='queued'),
    'sent',(SELECT count(*) FROM public.communication_outbox WHERE status='sent'),
    'failed',(SELECT count(*) FROM public.communication_outbox WHERE status='failed'),
    'cancelled',(SELECT count(*) FROM public.communication_outbox WHERE status='cancelled'),
    'sms_delivered',(SELECT count(*) FROM public.communication_outbox WHERE channel='sms' AND delivery_status='delivered'),
    'sms_failed',(SELECT count(*) FROM public.communication_outbox WHERE channel='sms' AND delivery_status IN ('failed','rejected','expired')),
    'email_sent',(SELECT count(*) FROM public.communication_outbox WHERE channel='email' AND status='sent'),
    'email_delivered',(SELECT count(*) FROM public.communication_outbox WHERE channel='email' AND delivery_status='delivered'),
    'whatsapp_delivered',(SELECT count(*) FROM public.communication_outbox WHERE channel='whatsapp' AND delivery_status='delivered'),
    'whatsapp_failed',(SELECT count(*) FROM public.communication_outbox WHERE channel='whatsapp' AND delivery_status='failed'),
    'inbound_responses',(SELECT count(*) FROM public.communication_inbound),
    'unmatched_inbound',(SELECT count(*) FROM public.communication_inbound WHERE customer_id IS NULL)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_communication_operations_summary() TO authenticated;

COMMENT ON TABLE public.communication_outbox IS 'Durable outbound queue for email, SMS and WhatsApp; queued is not delivered.';
COMMENT ON TABLE public.communication_inbound IS 'Inbound customer responses from configured communication providers.';
COMMENT ON TABLE public.communication_provider_events IS 'Idempotent provider delivery/event audit stream.';
