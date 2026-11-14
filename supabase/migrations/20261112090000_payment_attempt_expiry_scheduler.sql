-- Schedule expiry of stale online payment attempts.
-- Previously expire_stale_payment_attempts_360 existed but nothing called it, so M-Pesa/card attempts whose
-- provider callback never arrived stayed "pending" forever. The old body also failed bank transfers after
-- 30 minutes even though they are confirmed manually within ~72 hours, so bank transfers are now excluded.
-- A late successful provider callback is still reconciled afterwards (apply_customer_payment_provider_event
-- accepts success on a failed transaction), so expiring here never loses a real payment.

CREATE OR REPLACE FUNCTION public.expire_stale_payment_attempts_360(p_age_minutes integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_attempts integer; v_transactions integer;
BEGIN
  IF p_age_minutes < 1 OR p_age_minutes > 1440 THEN RAISE EXCEPTION 'Invalid expiry window'; END IF;

  WITH stale AS (
    SELECT a.id AS attempt_id, t.id AS transaction_id
    FROM public.payment_attempts a
    JOIN public.payment_transactions t ON t.id = a.payment_transaction_id
    WHERE a.status IN ('initiated','pending')
      AND t.status = 'pending'
      AND coalesce(t.method, '') <> 'bank_transfer'
      AND a.created_at < now() - make_interval(mins => p_age_minutes)
      -- never expire while the provider checkout window (plus a 15 minute grace for slow callbacks) is open
      AND coalesce(t.checkout_expires_at, a.created_at) + interval '15 minutes' < now()
    FOR UPDATE OF a, t SKIP LOCKED
  ), expired_attempts AS (
    UPDATE public.payment_attempts a
    SET status = 'expired', failure_reason = 'Payment attempt expired without a final provider result', updated_at = now()
    FROM stale s WHERE a.id = s.attempt_id
    RETURNING a.id
  ), expired_transactions AS (
    UPDATE public.payment_transactions t
    SET status = 'failed', failure_reason = 'Payment attempt expired without a final provider result',
        completed_at = now(), updated_at = now()
    FROM stale s WHERE t.id = s.transaction_id
    RETURNING t.id
  )
  SELECT (SELECT count(*) FROM expired_attempts), (SELECT count(*) FROM expired_transactions)
  INTO v_attempts, v_transactions;

  RETURN jsonb_build_object('success', true, 'expired_attempts', v_attempts, 'expired_transactions', v_transactions);
END; $function$;
REVOKE ALL ON FUNCTION public.expire_stale_payment_attempts_360(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_payment_attempts_360(integer) TO service_role;

-- Allow the new job through the worker boundary (same body as 20261104100000 plus the new job key).
CREATE OR REPLACE FUNCTION public.start_automation_job(p_job_key text, p_lock_seconds integer DEFAULT 300, p_trigger_source text DEFAULT 'scheduler'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
DECLARE
  v_now timestamptz:=now(); v_lock public.automation_job_locks%ROWTYPE; v_run_id uuid;
  v_lock_seconds integer:=greatest(30,least(coalesce(p_lock_seconds,300),3600));
  v_job text:=lower(trim(coalesce(p_job_key,'')));
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Automation worker boundary is service-role only'; END IF;
  IF v_job NOT IN ('deliver_communications','expire_inventory_reservations','reconcile_payment_provider_events','reconcile_communications','invoice_reminders','expire_payment_attempts') THEN
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
END; $function$;

INSERT INTO public.automation_job_settings(job_key, title, description, cron_expression) VALUES
 ('expire_payment_attempts', 'Expire stale payments', 'Closes M-Pesa and card payment attempts that never received a final result so customers can retry. Bank transfers are left for manual confirmation.', '*/10 * * * *')
ON CONFLICT (job_key) DO NOTHING;

SELECT private.ensure_automation_schedule();
