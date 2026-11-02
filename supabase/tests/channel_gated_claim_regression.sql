-- Email-first launch guard. Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/channel_gated_claim_regression.sql
-- Rolls back; needs the full migration chain applied.
BEGIN;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $$
DECLARE v_claimed text[]; v_sms_status text; v_old_status text; v_denied boolean := false;
BEGIN
  INSERT INTO public.communication_outbox(id,channel,recipient,subject,message,dedupe_key,created_at) VALUES
    ('00000000-0000-0000-0000-0000000000c1','email','buyer@example.com','Hi','body','gate-test-email',now()),
    ('00000000-0000-0000-0000-0000000000c2','sms','+254700000001',NULL,'body','gate-test-sms',now()),
    ('00000000-0000-0000-0000-0000000000c3','whatsapp','+254700000002','Hi','body','gate-test-wa',now()),
    ('00000000-0000-0000-0000-0000000000c4','sms','+254700000003',NULL,'old','gate-test-sms-old',now() - interval '5 days');

  SELECT array_agg(channel ORDER BY channel) INTO v_claimed FROM public.claim_communication_outbox_worker(50, ARRAY['email']);
  IF v_claimed IS DISTINCT FROM ARRAY['email']::text[] THEN RAISE EXCEPTION 'only configured channels may be claimed, got %', v_claimed; END IF;

  SELECT status INTO v_sms_status FROM public.communication_outbox WHERE id='00000000-0000-0000-0000-0000000000c2';
  IF v_sms_status <> 'queued' THEN RAISE EXCEPTION 'unconfigured sms row must stay queued, was %', v_sms_status; END IF;
  IF (SELECT attempt_count FROM public.communication_outbox WHERE id='00000000-0000-0000-0000-0000000000c2') <> 0 THEN RAISE EXCEPTION 'unclaimed rows must not burn attempts'; END IF;

  SELECT status INTO v_old_status FROM public.communication_outbox WHERE id='00000000-0000-0000-0000-0000000000c4';
  IF v_old_status <> 'cancelled' THEN RAISE EXCEPTION 'stale unconfigured sms must be cancelled, was %', v_old_status; END IF;

  -- Once sms is configured the fresh row is claimed.
  SELECT array_agg(channel ORDER BY channel) INTO v_claimed FROM public.claim_communication_outbox_worker(50, ARRAY['email','sms']);
  IF v_claimed IS DISTINCT FROM ARRAY['sms']::text[] THEN RAISE EXCEPTION 'sms should be claimable once configured, got %', v_claimed; END IF;

  -- No list = legacy behaviour (everything queued).
  SELECT array_agg(channel ORDER BY channel) INTO v_claimed FROM public.claim_communication_outbox_worker(50);
  IF v_claimed IS DISTINCT FROM ARRAY['whatsapp']::text[] THEN RAISE EXCEPTION 'default call should claim remaining queued rows, got %', v_claimed; END IF;

  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  BEGIN PERFORM * FROM public.claim_communication_outbox_worker(1, ARRAY['email']); EXCEPTION WHEN OTHERS THEN v_denied := true; END;
  IF NOT v_denied THEN RAISE EXCEPTION 'claim must be service_role only'; END IF;
END $$;
ROLLBACK;
SELECT 'channel_gated_claim_regression: OK' AS result;
