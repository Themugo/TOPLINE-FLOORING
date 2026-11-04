-- Run now used to say "started" even when the call to the worker function failed afterwards (wrong secret -> 401,
-- function not deployed -> 404). pg_net keeps each response for a few hours; expose the recent ones to staff so the
-- Automation page can say exactly what happened.
CREATE OR REPLACE FUNCTION public.get_automation_dispatch_log(p_request_id bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  PERFORM private.require_staff_permission('dashboard', 'select');
  IF to_regclass('net._http_response') IS NULL THEN RETURN '[]'::jsonb; END IF;
  BEGIN
  EXECUTE $q$
    SELECT coalesce(jsonb_agg(x ORDER BY x.id DESC), '[]'::jsonb) FROM (
      SELECT id, status_code, timed_out, left(error_msg, 300) AS error_msg, left(content, 400) AS content, created
        FROM net._http_response
       WHERE ($1::bigint IS NULL OR id = $1)
       ORDER BY id DESC LIMIT CASE WHEN $1::bigint IS NULL THEN 10 ELSE 1 END
    ) x
  $q$ INTO v USING p_request_id;
  EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb;
  END;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.get_automation_dispatch_log(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_automation_dispatch_log(bigint) TO authenticated;
