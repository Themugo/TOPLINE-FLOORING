-- ============================================================
-- TOPLINE COMM-10 through COMM-12
-- Inbound conversation handling, scheduler/worker certification,
-- and fail-closed provider activation readiness.
-- ============================================================

-- COMM-10: canonical conversation/thread control plane.
CREATE TABLE IF NOT EXISTS public.communication_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  provider text,
  provider_conversation_id text,
  subject text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_direction text CHECK (last_direction IN ('inbound','outbound')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communication_conversations_customer_idx
  ON public.communication_conversations(customer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS communication_conversations_status_idx
  ON public.communication_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS communication_conversations_assignee_idx
  ON public.communication_conversations(assigned_to, status, last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS communication_conversations_provider_thread_uidx
  ON public.communication_conversations(provider, channel, provider_conversation_id)
  WHERE provider_conversation_id IS NOT NULL;

ALTER TABLE public.communication_inbound
  ADD COLUMN IF NOT EXISTS conversation_thread_id uuid REFERENCES public.communication_conversations(id) ON DELETE SET NULL;
ALTER TABLE public.communication_outbox
  ADD COLUMN IF NOT EXISTS conversation_thread_id uuid REFERENCES public.communication_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS communication_inbound_thread_idx
  ON public.communication_inbound(conversation_thread_id, received_at DESC);
CREATE INDEX IF NOT EXISTS communication_outbox_thread_idx
  ON public.communication_outbox(conversation_thread_id, created_at DESC);

ALTER TABLE public.communication_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_conversations FROM PUBLIC, anon, authenticated;

-- Create/find a thread. Provider conversation IDs are authoritative where available.
-- When a provider has no conversation ID, a customer/channel conversation is reused
-- only while it has recent activity (72 hours); otherwise a new thread is opened.
CREATE OR REPLACE FUNCTION public.ensure_communication_conversation_worker(
  p_customer_id uuid,
  p_channel text,
  p_provider text DEFAULT NULL,
  p_provider_conversation_id text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_direction text DEFAULT 'inbound'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_id uuid;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid conversation channel'; END IF;
  IF p_direction NOT IN ('inbound','outbound') THEN RAISE EXCEPTION 'Invalid conversation direction'; END IF;

  IF nullif(trim(p_provider_conversation_id),'') IS NOT NULL THEN
    SELECT id INTO v_id
      FROM public.communication_conversations
     WHERE provider=trim(p_provider)
       AND channel=p_channel
       AND provider_conversation_id=trim(p_provider_conversation_id)
     LIMIT 1;
  ELSIF p_customer_id IS NOT NULL THEN
    SELECT id INTO v_id
      FROM public.communication_conversations
     WHERE customer_id=p_customer_id
       AND channel=p_channel
       AND status <> 'closed'
       AND last_message_at >= now()-interval '72 hours'
     ORDER BY last_message_at DESC
     LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.communication_conversations(
      customer_id,channel,provider,provider_conversation_id,subject,status,last_direction,last_message_at,unread_count
    ) VALUES (
      p_customer_id,p_channel,nullif(trim(p_provider),''),nullif(trim(p_provider_conversation_id),''),nullif(trim(p_subject),''),'open',p_direction,now(),CASE WHEN p_direction='inbound' THEN 1 ELSE 0 END
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.communication_conversations
       SET customer_id=coalesce(communication_conversations.customer_id,p_customer_id),
           subject=coalesce(nullif(trim(p_subject),''),communication_conversations.subject),
           last_direction=p_direction,
           last_message_at=now(),
           unread_count=CASE WHEN p_direction='inbound' THEN communication_conversations.unread_count+1 ELSE 0 END,
           updated_at=now()
     WHERE id=v_id;
  END IF;
  RETURN v_id;
END; $$;

-- Rebind the inbound worker so every inbound message is either attached to a
-- customer-safe conversation or remains explicitly unmatched/ambiguous.
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
  v_id uuid; v_customer_id uuid; v_thread_id uuid;
  v_match_count integer:=0; v_match_status text:='unmatched'; v_match_reason text:='no_customer_match';
  v_normalized text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid inbound channel'; END IF;
  IF nullif(trim(coalesce(p_sender,'')),'') IS NULL OR nullif(trim(coalesce(p_message,'')),'') IS NULL THEN RAISE EXCEPTION 'Inbound sender and message are required'; END IF;

  IF p_channel='email' THEN
    SELECT count(*), min(id) INTO v_match_count,v_customer_id FROM public.customers WHERE lower(trim(coalesce(email,'')))=lower(trim(p_sender));
    IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_email_match';
    ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_email_match'; END IF;
  ELSE
    v_normalized:=public.normalize_customer_phone(p_sender);
    IF v_normalized IS NOT NULL THEN
      SELECT count(*), min(id) INTO v_match_count,v_customer_id FROM public.customers WHERE public.normalize_customer_phone(phone)=v_normalized;
      IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_phone_match';
      ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_phone_match'; END IF;
    ELSE
      v_customer_id:=NULL; v_match_status:='unmatched'; v_match_reason:='invalid_phone_format';
    END IF;
  END IF;

  -- Insert first. The unique provider/message key is the idempotency boundary;
  -- only a newly inserted inbound message may create/update a conversation.
  INSERT INTO public.communication_inbound(customer_id,channel,sender,recipient,subject,message,provider,provider_message_id,conversation_id,media_url,payload,match_status,match_reason,matched_at)
  VALUES(v_customer_id,p_channel,trim(p_sender),nullif(trim(p_recipient),''),nullif(trim(p_subject),''),trim(p_message),p_provider,p_provider_message_id,p_conversation_id,p_media_url,coalesce(p_payload,'{}'::jsonb),v_match_status,v_match_reason,CASE WHEN v_match_status='matched' THEN now() ELSE NULL END)
  ON CONFLICT (provider,channel,provider_message_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_provider_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.communication_inbound WHERE provider=p_provider AND channel=p_channel AND provider_message_id=p_provider_message_id LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RETURN NULL; END IF;

  -- Existing rows have already been processed or are already in-flight. Do not
  -- increment thread counters or emit notifications for a duplicate webhook.
  IF EXISTS (SELECT 1 FROM public.communication_inbound WHERE id=v_id AND processed_at IS NOT NULL) THEN
    RETURN v_id;
  END IF;

  IF v_match_status='matched' THEN
    v_thread_id:=public.ensure_communication_conversation_worker(v_customer_id,p_channel,p_provider,p_conversation_id,p_subject,'inbound');
    UPDATE public.communication_inbound SET conversation_thread_id=v_thread_id WHERE id=v_id;
    INSERT INTO public.customer_communications(customer_id,channel,direction,subject,message,status,external_reference,created_at)
    VALUES(v_customer_id,p_channel,'inbound',nullif(trim(p_subject),''),trim(p_message),'logged',coalesce(p_provider_message_id,p_conversation_id),now());
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound','communication',v_id,v_customer_id,'Customer response received',left(trim(p_message),500),'info','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender,'match_status',v_match_status,'conversation_thread_id',v_thread_id));
  ELSE
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound.review','communication',v_id,NULL,
      CASE WHEN v_match_status='ambiguous' THEN 'Ambiguous customer response requires review' ELSE 'Unmatched customer response requires review' END,
      left(trim(p_message),500),'warning','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender,'match_status',v_match_status,'match_reason',v_match_reason));
  END IF;

  UPDATE public.communication_inbound SET processed_at=now() WHERE id=v_id;
  RETURN v_id;
END; $$;

-- Staff reply into an existing conversation. Recipient/customer identity is server-derived.
CREATE OR REPLACE FUNCTION public.queue_communication_conversation_reply(
  p_conversation_id uuid,
  p_channel text,
  p_recipient text,
  p_message text,
  p_subject text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_customer_id uuid; v_outbox_id uuid; v_user uuid;
BEGIN
  v_user:=private.require_staff_permission('customers','update');
  SELECT customer_id INTO v_customer_id FROM public.communication_conversations WHERE id=p_conversation_id FOR UPDATE;
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Conversation is not linked to a customer'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid communication channel'; END IF;
  IF nullif(trim(p_recipient),'') IS NULL OR nullif(trim(p_message),'') IS NULL THEN RAISE EXCEPTION 'Recipient and message are required'; END IF;

  INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,created_by,conversation_thread_id)
  VALUES(v_customer_id,p_channel,trim(p_recipient),nullif(trim(p_subject),''),trim(p_message),v_user,p_conversation_id)
  RETURNING id INTO v_outbox_id;

  UPDATE public.communication_conversations
     SET last_direction='outbound',last_message_at=now(),unread_count=0,updated_at=now()
   WHERE id=p_conversation_id;
  RETURN v_outbox_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_communication_conversations_360(
  p_status text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_days integer:=greatest(1,least(coalesce(p_days,30),365));
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  RETURN jsonb_build_object(
    'period_days',v_days,
    'conversations',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.last_message_at DESC) FROM (
      SELECT cc.*,c.name customer_name,c.email customer_email,c.phone customer_phone,
             (SELECT count(*) FROM public.communication_inbound i WHERE i.conversation_thread_id=cc.id) inbound_count,
             (SELECT count(*) FROM public.communication_outbox o WHERE o.conversation_thread_id=cc.id) outbound_count
        FROM public.communication_conversations cc
        LEFT JOIN public.customers c ON c.id=cc.customer_id
       WHERE cc.last_message_at>=now()-make_interval(days=>v_days)
         AND (p_status IS NULL OR cc.status=p_status)
         AND (p_customer_id IS NULL OR cc.customer_id=p_customer_id)
       LIMIT 500
    ) x),'[]'::jsonb)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.update_communication_conversation_360(
  p_conversation_id uuid,
  p_status text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_mark_read boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('customers','update');
  IF p_status IS NOT NULL AND p_status NOT IN ('open','pending','closed') THEN RAISE EXCEPTION 'Invalid conversation status'; END IF;
  UPDATE public.communication_conversations
     SET status=coalesce(p_status,status),
         assigned_to=CASE WHEN p_assigned_to IS NULL THEN assigned_to ELSE p_assigned_to END,
         unread_count=CASE WHEN p_mark_read THEN 0 ELSE unread_count END,
         updated_at=now()
   WHERE id=p_conversation_id;
  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_communication_conversation_worker(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.queue_communication_conversation_reply(uuid,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_communication_conversations_360(text,uuid,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_communication_conversation_360(uuid,text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_communication_conversation_worker(uuid,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_communication_conversation_reply(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_communication_conversations_360(text,uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_communication_conversation_360(uuid,text,uuid,boolean) TO authenticated;

-- COMM-11: make the scheduler's delivery job legal at the database boundary.
CREATE OR REPLACE FUNCTION public.start_automation_job(
  p_job_key text,
  p_lock_seconds integer DEFAULT 300,
  p_trigger_source text DEFAULT 'scheduler'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_now timestamptz:=now(); v_lock public.automation_job_locks%ROWTYPE; v_run_id uuid;
  v_lock_seconds integer:=greatest(30,least(coalesce(p_lock_seconds,300),3600));
  v_job text:=lower(trim(coalesce(p_job_key,'')));
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Automation worker boundary is service-role only'; END IF;
  IF v_job NOT IN ('deliver_communications','expire_inventory_reservations','reconcile_payment_provider_events','reconcile_communications') THEN
    RAISE EXCEPTION 'Unsupported automation job';
  END IF;
  SELECT * INTO v_lock FROM public.automation_job_locks WHERE job_key=v_job FOR UPDATE;
  IF FOUND AND v_lock.locked_until>v_now THEN
    RETURN jsonb_build_object('acquired',false,'job_key',v_job,'run_id',v_lock.run_id,'locked_until',v_lock.locked_until);
  END IF;
  IF FOUND THEN
    UPDATE public.automation_job_runs SET status='timed_out',finished_at=v_now,error_message='Worker lock expired before completion' WHERE id=v_lock.run_id AND status='running';
  END IF;
  INSERT INTO public.automation_job_runs(job_key,status,trigger_source) VALUES(v_job,'running',left(coalesce(nullif(trim(p_trigger_source),''),'scheduler'),80)) RETURNING id INTO v_run_id;
  INSERT INTO public.automation_job_locks(job_key,run_id,locked_until,updated_at)
  VALUES(v_job,v_run_id,v_now+make_interval(secs=>v_lock_seconds),v_now)
  ON CONFLICT(job_key) DO UPDATE SET run_id=excluded.run_id,locked_until=excluded.locked_until,updated_at=excluded.updated_at;
  RETURN jsonb_build_object('acquired',true,'job_key',v_job,'run_id',v_run_id,'locked_until',v_now+make_interval(secs=>v_lock_seconds));
END; $$;

-- Scheduler certification read model: detects failed jobs, stale locks and stale queued messages.
CREATE OR REPLACE FUNCTION public.get_communications_worker_certification_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_stale_locks integer; v_failed integer; v_stale_queue integer; v_unknown integer; v_result jsonb;
BEGIN
  PERFORM private.require_staff_permission('dashboard','select');
  SELECT count(*) INTO v_stale_locks FROM public.automation_job_locks WHERE locked_until<now();
  SELECT count(*) INTO v_failed FROM public.automation_job_runs WHERE job_key IN ('deliver_communications','reconcile_communications') AND status IN ('failed','timed_out') AND started_at>=now()-interval '24 hours';
  SELECT count(*) INTO v_stale_queue FROM public.communication_outbox WHERE status='queued' AND created_at<now()-interval '30 minutes';
  SELECT count(*) INTO v_unknown FROM public.communication_outbox WHERE delivery_status='unknown' AND created_at>=now()-interval '24 hours';
  v_result:=jsonb_build_object(
    'checked_at',now(),
    'stale_locks',v_stale_locks,
    'failed_or_timed_out_communication_jobs_24h',v_failed,
    'stale_queued_messages',v_stale_queue,
    'unknown_delivery_states_24h',v_unknown,
    'scheduler_delivery_job_enabled',true,
    'healthy',v_stale_locks=0 AND v_failed=0
  );
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.get_communications_worker_certification_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_communications_worker_certification_360() TO authenticated;

-- COMM-12: provider activation registry/readiness. Secrets remain Edge environment-only.
CREATE TABLE IF NOT EXISTS public.communication_provider_activation (
  provider text NOT NULL,
  channel text NOT NULL CHECK(channel IN ('email','sms','whatsapp')),
  activation_status text NOT NULL DEFAULT 'disabled' CHECK(activation_status IN ('disabled','ready','active','suspended')),
  last_checked_at timestamptz,
  last_check_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,channel)
);

INSERT INTO public.communication_provider_activation(provider,channel,activation_status)
VALUES ('brevo','email','disabled'),('africastalking','sms','disabled'),('meta_whatsapp','whatsapp','disabled')
ON CONFLICT(provider,channel) DO NOTHING;

ALTER TABLE public.communication_provider_activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_provider_activation FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_communication_provider_activation_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('dashboard','select');
  RETURN jsonb_build_object(
    'generated_at',now(),
    'providers',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.channel) FROM (
      SELECT a.provider,a.channel,a.activation_status,a.last_checked_at,a.last_check_result
        FROM public.communication_provider_activation a
    ) x),'[]'::jsonb),
    'secret_source','Supabase Edge Function environment secrets only',
    'database_does_not_store_provider_credentials',true
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_communication_provider_activation_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_communication_provider_activation_360() TO authenticated;

COMMENT ON TABLE public.communication_conversations IS 'Canonical customer communication conversation/thread control plane. Provider IDs are used where supplied; otherwise recent customer/channel activity is grouped within a bounded 72-hour window.';
COMMENT ON TABLE public.communication_provider_activation IS 'Provider activation state only; credentials are never stored here and remain Edge environment secrets.';
