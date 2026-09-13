-- Operation 7: Communications & Customer Journey 360
-- Converges preferences, event routing, provider delivery and inbound response
-- into one auditable operational control plane.

CREATE TABLE IF NOT EXISTS public.communication_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  entity_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'routed' CHECK (status IN ('routed','partially_queued','queued','suppressed','failed')),
  queued_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communication_workflow_events_customer_idx ON public.communication_workflow_events(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS communication_workflow_events_type_idx ON public.communication_workflow_events(event_type,created_at DESC);
ALTER TABLE public.communication_workflow_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_workflow_events FROM anon;
GRANT SELECT ON public.communication_workflow_events TO authenticated;
DROP POLICY IF EXISTS communication_workflow_events_staff ON public.communication_workflow_events;
CREATE POLICY communication_workflow_events_staff ON public.communication_workflow_events
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('customers','select'));

-- Customers can manage their own channel preferences; staff can manage them for support.
CREATE OR REPLACE FUNCTION public.update_customer_notification_preferences(
  p_customer_id uuid,
  p_email_enabled boolean,
  p_sms_enabled boolean,
  p_whatsapp_enabled boolean,
  p_marketing_email_enabled boolean DEFAULT false,
  p_marketing_sms_enabled boolean DEFAULT false
)
RETURNS public.customer_notification_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v public.customer_notification_preferences;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.get_current_customer_id() IS DISTINCT FROM p_customer_id THEN
    PERFORM private.require_staff_permission('customers','update');
  END IF;
  INSERT INTO public.customer_notification_preferences(customer_id)
  VALUES(p_customer_id) ON CONFLICT DO NOTHING;
  UPDATE public.customer_notification_preferences
  SET email_enabled=coalesce(p_email_enabled,email_enabled),
      sms_enabled=coalesce(p_sms_enabled,sms_enabled),
      whatsapp_enabled=coalesce(p_whatsapp_enabled,whatsapp_enabled),
      marketing_email_enabled=coalesce(p_marketing_email_enabled,marketing_email_enabled),
      marketing_sms_enabled=coalesce(p_marketing_sms_enabled,marketing_sms_enabled),
      updated_at=now()
  WHERE customer_id=p_customer_id
  RETURNING * INTO v;
  IF v.customer_id IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_customer_notification_preferences(uuid,boolean,boolean,boolean,boolean,boolean) TO authenticated;

-- Replace event routing with an idempotent workflow record around the existing outbox.
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
  v_message text; v_subject text; v_count integer:=0; v_key text; v_status text;
  v_channels integer:=0;
BEGIN
  IF p_customer_id IS NULL THEN RETURN 0; END IF;
  v_key:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':'||coalesce(p_status,'updated');
  IF EXISTS (SELECT 1 FROM public.communication_workflow_events WHERE event_key=v_key) THEN
    RETURN COALESCE((SELECT queued_count FROM public.communication_workflow_events WHERE event_key=v_key),0);
  END IF;
  SELECT * INTO r FROM public.notification_rules WHERE event_type=p_event_type AND enabled;
  SELECT * INTO c FROM public.customers WHERE id=p_customer_id;
  IF NOT FOUND OR r.event_type IS NULL THEN
    INSERT INTO public.communication_workflow_events(event_key,event_type,entity_id,customer_id,status,metadata)
    VALUES(v_key,p_event_type,p_entity_id,p_customer_id,'suppressed',jsonb_build_object('reason',CASE WHEN r.event_type IS NULL THEN 'no_enabled_rule' ELSE 'customer_not_found' END));
    RETURN 0;
  END IF;
  INSERT INTO public.customer_notification_preferences(customer_id) VALUES(p_customer_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM public.customer_notification_preferences WHERE customer_id=p_customer_id;
  v_subject:=replace(r.subject_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(replace(r.message_template,'{{status}}',coalesce(p_status,'updated')),'{{customer_name}}',coalesce(c.name,'Customer'));

  IF r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'email',trim(c.email),v_subject,v_message,v_key||':email') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,message,dedupe_key)
    VALUES(p_customer_id,'sms',public.normalize_customer_phone(c.phone),v_message,v_key||':sms') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'whatsapp',public.normalize_customer_phone(c.phone),v_subject,v_message,v_key||':whatsapp') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  v_channels := (CASE WHEN r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END);
  v_status:=CASE WHEN v_count>0 THEN CASE WHEN v_count<v_channels THEN 'partially_queued' ELSE 'queued' END ELSE 'suppressed' END;
  INSERT INTO public.communication_workflow_events(event_key,event_type,entity_id,customer_id,status,queued_count,metadata)
  VALUES(v_key,p_event_type,p_entity_id,p_customer_id,v_status,v_count,jsonb_build_object('configured_channels',v_channels,'status',p_status));
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.queue_customer_notification_for_event(text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_communications_360()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_unlocked integer:=0; v_failed integer:=0; v_unmatched integer:=0;
BEGIN
  PERFORM private.require_staff_permission('customers','update');
  UPDATE public.communication_outbox
  SET locked_at=NULL
  WHERE status='queued' AND locked_at IS NOT NULL AND locked_at < now()-interval '10 minutes';
  GET DIAGNOSTICS v_unlocked=ROW_COUNT;
  SELECT count(*) INTO v_failed FROM public.communication_outbox WHERE status='failed' AND attempt_count>=max_attempts;
  SELECT count(*) INTO v_unmatched FROM public.communication_inbound WHERE customer_id IS NULL AND received_at >= now()-interval '30 days';
  RETURN jsonb_build_object('stale_locks_released',v_unlocked,'exhausted_failures',v_failed,'unmatched_inbound_30d',v_unmatched,'checked_at',now());
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_communications_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_communications_360() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_communications_customer_journey_360(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_days integer:=greatest(1,least(coalesce(p_days,30),365));
BEGIN
  PERFORM private.require_staff_permission('customers','select');
  RETURN jsonb_build_object(
    'period_days',v_days,
    'metrics',jsonb_build_object(
      'queued',(SELECT count(*) FROM public.communication_outbox WHERE status='queued'),
      'sent',(SELECT count(*) FROM public.communication_outbox WHERE status='sent'),
      'failed',(SELECT count(*) FROM public.communication_outbox WHERE status='failed'),
      'cancelled',(SELECT count(*) FROM public.communication_outbox WHERE status='cancelled'),
      'pending_delivery',(SELECT count(*) FROM public.communication_outbox WHERE delivery_status IN ('pending','accepted','submitted','buffered')),
      'delivered',(SELECT count(*) FROM public.communication_outbox WHERE delivery_status='delivered'),
      'delivery_failures',(SELECT count(*) FROM public.communication_outbox WHERE delivery_status IN ('failed','rejected','expired')),
      'stale_queued',(SELECT count(*) FROM public.communication_outbox WHERE status='queued' AND created_at < now()-interval '30 minutes'),
      'unmatched_inbound',(SELECT count(*) FROM public.communication_inbound WHERE customer_id IS NULL),
      'workflow_events',(SELECT count(*) FROM public.communication_workflow_events WHERE created_at >= now()-make_interval(days=>v_days)),
      'suppressed_workflows',(SELECT count(*) FROM public.communication_workflow_events WHERE status='suppressed' AND created_at >= now()-make_interval(days=>v_days))
    ),
    'channels',COALESCE((SELECT jsonb_agg(x) FROM (SELECT channel,count(*) total,count(*) FILTER (WHERE status='sent') sent,count(*) FILTER (WHERE status='failed') failed,count(*) FILTER (WHERE delivery_status='delivered') delivered FROM public.communication_outbox WHERE created_at >= now()-make_interval(days=>v_days) GROUP BY channel ORDER BY channel) x),'[]'::jsonb),
    'recent_failures',COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC) FROM public.communication_outbox o WHERE o.status='failed' OR o.delivery_status IN ('failed','rejected','expired') LIMIT 25),'[]'::jsonb),
    'unmatched_inbound',COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.received_at DESC) FROM public.communication_inbound i WHERE i.customer_id IS NULL LIMIT 25),'[]'::jsonb),
    'workflow_events',COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY w.created_at DESC) FROM public.communication_workflow_events w WHERE w.created_at >= now()-make_interval(days=>v_days) LIMIT 50),'[]'::jsonb)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_communications_customer_journey_360(integer) TO authenticated;

COMMENT ON TABLE public.communication_workflow_events IS 'Idempotent business-event routing ledger linking customer events to durable outbound communication decisions.';
