-- Phase 10: Background workers and scheduled-process hardening.
-- Make explicit scheduler re-syncs idempotent while preserving job settings,
-- worker authentication, run locks and the existing five-job control plane.

CREATE OR REPLACE FUNCTION private.ensure_automation_schedule()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  s record;
  v_n integer := 0;
  v_job_name text;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN 0; END IF;

  FOR s IN SELECT * FROM public.automation_job_settings ORDER BY job_key LOOP
    v_job_name := 'topline-' || s.job_key;

    -- Re-sync is intentionally idempotent: remove the prior named schedule
    -- before registering the current expression and enabled state.
    EXECUTE 'SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = $1'
      USING v_job_name;

    IF s.enabled THEN
      EXECUTE 'SELECT cron.schedule($1, $2, $3)'
        USING v_job_name, s.cron_expression,
          format('SELECT private.dispatch_automation_job(%L, %L)', s.job_key, 'pg_cron');
      v_n := v_n + 1;
    END IF;
  END LOOP;

  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION private.ensure_automation_schedule() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.ensure_automation_schedule() IS
  'Idempotently reconciles named pg_cron schedules with automation_job_settings; private control-plane function.';
