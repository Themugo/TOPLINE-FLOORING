-- TOPLINE 2026-10-16 audit, part 5: bound inbound message size.
--
-- record_inbound_communication_worker stored the sender, subject, body and the full raw provider payload with no
-- length limit. Anyone can email or text the inbound addresses, so a single oversized message could write megabytes
-- into communication_inbound twice (body plus payload) and slow the admin conversation views that load it.
-- Fields are now capped: sender 320, subject 500, body 20,000 characters, media URL 2,048, provider message id 512,
-- and a raw payload over 64 KB is replaced by a small marker recording its original size.

CREATE OR REPLACE FUNCTION public.record_inbound_communication_worker(p_provider text, p_channel text, p_sender text, p_recipient text DEFAULT NULL::text, p_subject text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_provider_message_id text DEFAULT NULL::text, p_conversation_id text DEFAULT NULL::text, p_media_url text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  v_id uuid; v_customer_id uuid; v_thread_id uuid;
  v_match_count integer:=0; v_match_status text:='unmatched'; v_match_reason text:='no_customer_match';
  v_normalized text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid inbound channel'; END IF;
  IF nullif(trim(coalesce(p_sender,'')),'') IS NULL OR nullif(trim(coalesce(p_message,'')),'') IS NULL THEN RAISE EXCEPTION 'Inbound sender and message are required'; END IF;

  -- Inbound content comes from anyone who can email or text us. Bound every stored field so one oversized
  -- message cannot write megabytes into the database (the raw payload would otherwise be stored a second time).
  p_sender := left(trim(p_sender), 320);
  p_subject := left(p_subject, 500);
  p_message := left(p_message, 20000);
  p_media_url := left(p_media_url, 2048);
  p_provider_message_id := left(p_provider_message_id, 512);
  IF pg_column_size(coalesce(p_payload, '{}'::jsonb)) > 65536 THEN
    p_payload := jsonb_build_object('truncated', true, 'original_bytes', pg_column_size(p_payload));
  END IF;

  IF p_channel='email' THEN
    SELECT count(*), (array_agg(id))[1] INTO v_match_count,v_customer_id FROM public.customers WHERE lower(trim(coalesce(email,'')))=lower(trim(p_sender));
    IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_email_match';
    ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_email_match'; END IF;
  ELSE
    v_normalized:=public.normalize_customer_phone(p_sender);
    IF v_normalized IS NOT NULL THEN
      SELECT count(*), (array_agg(id))[1] INTO v_match_count,v_customer_id FROM public.customers WHERE public.normalize_customer_phone(phone)=v_normalized;
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
END; $function$;
