-- Operation 17 — Production Automation & Worker Control 360
-- Durable, replay-safe control plane for scheduled operational workers.

CREATE TABLE IF NOT EXISTS public.automation_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','succeeded','failed','timed_out','skipped')),
  trigger_source text NOT NULL DEFAULT 'scheduler',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_job_runs_job_time_idx
  ON public.automation_job_runs(job_key, started_at DESC);
CREATE INDEX IF NOT EXISTS automation_job_runs_status_time_idx
  ON public.automation_job_runs(status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_job_locks (
  job_key text PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.automation_job_runs(id) ON DELETE CASCADE,
  locked_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_job_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_job_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.automation_job_locks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_automation_job(
  p_job_key text,
  p_lock_seconds integer DEFAULT 300,
  p_trigger_source text DEFAULT 'scheduler'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_now timestamptz := now();
  v_lock public.automation_job_locks%ROWTYPE;
  v_run_id uuid;
  v_lock_seconds integer := greatest(30, least(coalesce(p_lock_seconds,300), 3600));
  v_job text := lower(trim(coalesce(p_job_key,'')));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Automation worker boundary is service-role only';
  END IF;
  IF v_job NOT IN ('expire_inventory_reservations','reconcile_payment_provider_events','reconcile_communications') THEN
    RAISE EXCEPTION 'Unsupported automation job';
  END IF;

  SELECT * INTO v_lock
    FROM public.automation_job_locks
   WHERE job_key=v_job
   FOR UPDATE;

  IF FOUND AND v_lock.locked_until > v_now THEN
    RETURN jsonb_build_object('acquired',false,'job_key',v_job,'run_id',v_lock.run_id,'locked_until',v_lock.locked_until);
  END IF;

  IF FOUND THEN
    UPDATE public.automation_job_runs
       SET status='timed_out', finished_at=v_now, error_message='Worker lock expired before completion'
     WHERE id=v_lock.run_id AND status='running';
  END IF;

  INSERT INTO public.automation_job_runs(job_key,status,trigger_source)
  VALUES(v_job,'running',left(coalesce(nullif(trim(p_trigger_source),''),'scheduler'),80))
  RETURNING id INTO v_run_id;

  INSERT INTO public.automation_job_locks(job_key,run_id,locked_until,updated_at)
  VALUES(v_job,v_run_id,v_now+make_interval(secs=>v_lock_seconds),v_now)
  ON CONFLICT (job_key) DO UPDATE
    SET run_id=excluded.run_id, locked_until=excluded.locked_until, updated_at=excluded.updated_at;

  RETURN jsonb_build_object('acquired',true,'job_key',v_job,'run_id',v_run_id,'locked_until',v_now+make_interval(secs=>v_lock_seconds));
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_automation_job(
  p_run_id uuid,
  p_status text,
  p_result jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_job text;
  v_finished timestamptz := now();
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Automation worker boundary is service-role only';
  END IF;
  IF p_status NOT IN ('succeeded','failed','timed_out','skipped') THEN
    RAISE EXCEPTION 'Invalid automation completion status';
  END IF;
  UPDATE public.automation_job_runs
     SET status=p_status,
         finished_at=v_finished,
         result=CASE WHEN jsonb_typeof(coalesce(p_result,'{}'::jsonb))='object' THEN p_result ELSE jsonb_build_object('value',p_result) END,
         error_message=left(nullif(trim(p_error_message),''),2000)
   WHERE id=p_run_id AND status='running'
   RETURNING job_key INTO v_job;
  IF v_job IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.automation_job_locks WHERE job_key=v_job AND run_id=p_run_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconcile_communications_worker_360()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_unlocked integer := 0;
  v_exhausted integer := 0;
  v_unmatched integer := 0;
  v_stale integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Automation worker boundary is service-role only';
  END IF;
  UPDATE public.communication_outbox
     SET locked_at=NULL
   WHERE status='queued' AND locked_at IS NOT NULL AND locked_at < now()-interval '10 minutes';
  GET DIAGNOSTICS v_unlocked=ROW_COUNT;
  SELECT count(*) INTO v_exhausted FROM public.communication_outbox WHERE status='failed' AND attempt_count>=max_attempts;
  SELECT count(*) INTO v_unmatched FROM public.communication_inbound WHERE customer_id IS NULL AND received_at >= now()-interval '30 days';
  SELECT count(*) INTO v_stale FROM public.communication_outbox WHERE status='queued' AND created_at < now()-interval '30 minutes';
  RETURN jsonb_build_object(
    'stale_locks_released',v_unlocked,
    'exhausted_failures',v_exhausted,
    'unmatched_inbound_30d',v_unmatched,
    'stale_queued',v_stale,
    'checked_at',now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_automation_operations_360(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_days integer := greatest(1,least(coalesce(p_days,7),90));
BEGIN
  PERFORM private.require_staff_permission('dashboard','select');
  RETURN jsonb_build_object(
    'days',v_days,
    'generated_at',now(),
    'jobs',COALESCE((SELECT jsonb_agg(x ORDER BY x.job_key) FROM (
      SELECT j.job_key,
             l.locked_until,
             l.run_id AS active_run_id,
             (SELECT r.status FROM public.automation_job_runs r WHERE r.id=l.run_id) AS active_status,
             (SELECT r.started_at FROM public.automation_job_runs r WHERE r.id=l.run_id) AS active_started_at,
             (SELECT r.finished_at FROM public.automation_job_runs r WHERE r.id=l.run_id) AS active_finished_at,
             (SELECT r.status FROM public.automation_job_runs r WHERE r.job_key=j.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_status,
             (SELECT r.started_at FROM public.automation_job_runs r WHERE r.job_key=j.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_started_at,
             (SELECT r.finished_at FROM public.automation_job_runs r WHERE r.job_key=j.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_finished_at,
             (SELECT r.error_message FROM public.automation_job_runs r WHERE r.job_key=j.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_error
        FROM (VALUES ('expire_inventory_reservations'),('reconcile_payment_provider_events'),('reconcile_communications')) j(job_key)
        LEFT JOIN public.automation_job_locks l ON l.job_key=j.job_key
    ) x),'[]'::jsonb),
    'recent_runs',COALESCE((SELECT jsonb_agg(r ORDER BY r.started_at DESC) FROM (
      SELECT id,job_key,status,trigger_source,started_at,finished_at,result,error_message
        FROM public.automation_job_runs
       WHERE started_at >= now()-make_interval(days=>v_days)
       ORDER BY started_at DESC LIMIT 100
    ) r),'[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.start_automation_job(text,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_automation_job(uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconcile_communications_worker_360() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_automation_job(text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_automation_job(uuid,text,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_communications_worker_360() TO service_role;

REVOKE ALL ON FUNCTION public.get_automation_operations_360(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_automation_operations_360(integer) TO authenticated;

COMMENT ON TABLE public.automation_job_runs IS 'Durable service-role-only execution ledger for scheduled Topline operational workers.';
COMMENT ON TABLE public.automation_job_locks IS 'Concurrency locks for scheduled Topline operational workers.';
COMMENT ON FUNCTION public.start_automation_job(text,integer,text) IS 'Acquires a bounded worker lock and creates an auditable run; service-role only.';
COMMENT ON FUNCTION public.finish_automation_job(uuid,text,jsonb,text) IS 'Completes an automation run and releases its worker lock; service-role only.';
