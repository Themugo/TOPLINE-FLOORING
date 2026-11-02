-- Email-first launch: only claim outbox rows for channels whose provider is actually configured.
--
-- Before this migration the delivery worker claimed every queued row. With SMS (Africa's Talking) and WhatsApp (Meta)
-- not yet configured, each order/payment/delivery event still queued an sms and a whatsapp row (preferences default to on),
-- the worker claimed them, failed with "provider is not configured", burned all retries and parked them as `failed`,
-- which creates noise and permanently loses customer notices that would have been fine to send once the provider is live.
--
-- Now the worker passes the list of configured channels. Rows for other channels stay `queued` untouched, and sms/whatsapp
-- rows that outlive a 72 hour freshness window are cancelled (a "your delivery arrived" text three weeks late is worse than none).
-- Calling with no channel list keeps the previous behaviour.

DROP FUNCTION IF EXISTS public.claim_communication_outbox_worker(integer);

CREATE OR REPLACE FUNCTION public.claim_communication_outbox_worker(p_limit integer DEFAULT 10, p_channels text[] DEFAULT NULL)
RETURNS SETOF public.communication_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  UPDATE public.communication_outbox o
     SET status = 'cancelled', delivery_status = 'rejected', locked_at = NULL,
         error_message = 'Recipient suppressed (' || s.reason || ')'
    FROM public.communication_suppressions s
   WHERE o.status = 'queued' AND o.channel = 'email'
     AND lower(btrim(o.recipient)) = s.email
     AND s.reason IN ('hard_bounce','invalid_email','spam_complaint');

  -- Messages for channels that are not configured wait, but never indefinitely.
  IF p_channels IS NOT NULL THEN
    UPDATE public.communication_outbox o
       SET status = 'cancelled', delivery_status = 'rejected', locked_at = NULL,
           error_message = 'Not sent: ' || o.channel || ' provider was not configured within 72 hours'
     WHERE o.status = 'queued'
       AND o.channel IN ('sms','whatsapp')
       AND NOT (o.channel = ANY(p_channels))
       AND o.created_at < now() - interval '72 hours';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.communication_outbox
    WHERE status='queued'
      AND next_attempt_at <= now()
      AND attempt_count < max_attempts
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
      AND (p_channels IS NULL OR channel = ANY(p_channels))
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
$function$;

REVOKE ALL ON FUNCTION public.claim_communication_outbox_worker(integer, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_communication_outbox_worker(integer, text[]) TO service_role;

-- Backfill: rows parked as failed ONLY because a provider was not configured can be re-queued once it is. Do it once, narrowly.
UPDATE public.communication_outbox
   SET status = 'queued', attempt_count = 0, delivery_status = 'pending', error_message = NULL,
       next_attempt_at = now(), locked_at = NULL
 WHERE status = 'failed'
   AND channel IN ('sms','whatsapp')
   AND created_at > now() - interval '72 hours'
   AND (error_message ILIKE '%provider is not configured%');
