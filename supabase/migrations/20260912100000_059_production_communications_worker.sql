-- Phase 3: production email/SMS delivery worker boundary.
-- Worker-only RPCs are intentionally separate from staff RPCs.
-- They require the Supabase service_role JWT and are never granted to authenticated users.

CREATE OR REPLACE FUNCTION public.claim_communication_outbox_worker(p_limit integer DEFAULT 10)
RETURNS SETOF public.communication_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.communication_outbox
    WHERE status='queued'
      AND next_attempt_at <= now()
      AND attempt_count < max_attempts
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
    ORDER BY next_attempt_at,created_at
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1,least(coalesce(p_limit,10),50))
  )
  UPDATE public.communication_outbox o
  SET locked_at=now(),last_attempt_at=now(),attempt_count=o.attempt_count+1
  FROM candidates c
  WHERE o.id=c.id
  RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_communication_delivery_worker(
  p_outbox_id uuid,
  p_provider text,
  p_provider_reference text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  UPDATE public.communication_outbox
  SET status='sent',
      provider=nullif(trim(p_provider),''),
      provider_reference=nullif(trim(p_provider_reference),''),
      sent_at=now(),
      locked_at=NULL,
      error_message=NULL
  WHERE id=p_outbox_id AND status='queued';

  IF NOT FOUND THEN RAISE EXCEPTION 'Queued message not found'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_communication_delivery_worker(
  p_outbox_id uuid,
  p_error_message text,
  p_retry boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_attempts integer;
  v_max integer;
  v_status text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  SELECT attempt_count,max_attempts,status
  INTO v_attempts,v_max,v_status
  FROM public.communication_outbox
  WHERE id=p_outbox_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF v_status <> 'queued' THEN RAISE EXCEPTION 'Only queued messages can fail'; END IF;

  IF p_retry AND v_attempts < v_max THEN
    UPDATE public.communication_outbox
    SET next_attempt_at=now() + make_interval(secs => least(3600,greatest(60,30 * power(2,greatest(v_attempts-1,0))::integer))),
        locked_at=NULL,
        error_message=nullif(trim(p_error_message),'')
    WHERE id=p_outbox_id;
    v_status := 'queued';
  ELSE
    UPDATE public.communication_outbox
    SET status='failed',locked_at=NULL,error_message=nullif(trim(p_error_message),'')
    WHERE id=p_outbox_id;
    v_status := 'failed';
  END IF;

  RETURN jsonb_build_object('status',v_status,'attempt_count',v_attempts,'max_attempts',v_max);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_communication_outbox_worker(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_communication_delivery_worker(uuid,text,boolean) FROM PUBLIC, anon, authenticated;
