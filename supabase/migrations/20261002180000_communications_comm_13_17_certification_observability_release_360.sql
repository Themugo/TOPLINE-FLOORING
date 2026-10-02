-- TOPLINE COMM-13 through COMM-17
-- Two-customer UAT evidence, failure/recovery observability,
-- security certification and fail-closed communications release gate.

CREATE TABLE IF NOT EXISTS public.communication_certification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_key text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('local','staging','production')),
  status text NOT NULL CHECK (status IN ('pending','passed','failed','blocked')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communication_certification_runs_key_idx
  ON public.communication_certification_runs(certification_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.communication_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  category text NOT NULL,
  status text NOT NULL CHECK (status IN ('open','investigating','resolved','ignored')) DEFAULT 'open',
  outbox_id uuid REFERENCES public.communication_outbox(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.communication_conversations(id) ON DELETE SET NULL,
  provider text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS communication_incident_events_status_idx
  ON public.communication_incident_events(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS communication_incident_events_outbox_idx
  ON public.communication_incident_events(outbox_id, created_at DESC);

ALTER TABLE public.communication_certification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_incident_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_certification_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.communication_incident_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_communication_certification_360(
  p_certification_key text,
  p_environment text,
  p_status text,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM private.require_staff_permission('customers','update');
  IF p_environment NOT IN ('local','staging','production') THEN RAISE EXCEPTION 'Invalid certification environment'; END IF;
  IF p_status NOT IN ('pending','passed','failed','blocked') THEN RAISE EXCEPTION 'Invalid certification status'; END IF;
  INSERT INTO public.communication_certification_runs(certification_key,environment,status,evidence,completed_at,performed_by)
  VALUES(trim(p_certification_key),p_environment,p_status,coalesce(p_evidence,'{}'::jsonb),CASE WHEN p_status='pending' THEN NULL ELSE now() END,auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_communication_incident_360(
  p_incident_key text,
  p_severity text,
  p_category text,
  p_status text DEFAULT 'open',
  p_outbox_id uuid DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM private.require_staff_permission('customers','update');
  IF p_severity NOT IN ('info','warning','critical') THEN RAISE EXCEPTION 'Invalid incident severity'; END IF;
  IF p_status NOT IN ('open','investigating','resolved','ignored') THEN RAISE EXCEPTION 'Invalid incident status'; END IF;
  INSERT INTO public.communication_incident_events(incident_key,severity,category,status,outbox_id,conversation_id,provider,details,resolved_at)
  VALUES(trim(p_incident_key),p_severity,trim(p_category),p_status,p_outbox_id,p_conversation_id,nullif(trim(p_provider),''),coalesce(p_details,'{}'::jsonb),CASE WHEN p_status IN ('resolved','ignored') THEN now() ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_communications_release_gate_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_failed_24h integer;
  v_stale integer;
  v_unknown integer;
  v_open_critical integer;
  v_provider_ready boolean;
  v_security_passed boolean;
  v_uat_passed boolean;
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  SELECT count(*) INTO v_failed_24h FROM public.automation_job_runs
   WHERE job_key IN ('deliver_communications','reconcile_communications')
     AND status IN ('failed','timed_out') AND started_at >= now()-interval '24 hours';
  SELECT count(*) INTO v_stale FROM public.communication_outbox
   WHERE status='queued' AND created_at < now()-interval '30 minutes';
  SELECT count(*) INTO v_unknown FROM public.communication_outbox
   WHERE delivery_status='unknown' AND created_at >= now()-interval '24 hours';
  SELECT count(*) INTO v_open_critical FROM public.communication_incident_events
   WHERE severity='critical' AND status IN ('open','investigating');
  SELECT coalesce(bool_and(configured),false) INTO v_provider_ready
    FROM public.communication_provider_activation
   WHERE enabled=true;
  SELECT coalesce(bool_and(status='passed'),false) INTO v_security_passed
    FROM public.communication_certification_runs
   WHERE certification_key='COMM-16-security' AND environment='staging';
  SELECT coalesce(bool_and(status='passed'),false) INTO v_uat_passed
    FROM public.communication_certification_runs
   WHERE certification_key='COMM-13-two-customer-uat' AND environment='staging';
  RETURN jsonb_build_object(
    'release_ready', (v_failed_24h=0 AND v_stale=0 AND v_unknown=0 AND v_open_critical=0 AND v_provider_ready AND v_security_passed AND v_uat_passed),
    'failed_workers_24h',v_failed_24h,
    'stale_queue',v_stale,
    'unknown_delivery_24h',v_unknown,
    'open_critical_incidents',v_open_critical,
    'providers_ready',v_provider_ready,
    'security_certified',v_security_passed,
    'two_customer_uat_certified',v_uat_passed
  );
END; $$;

REVOKE ALL ON FUNCTION public.record_communication_certification_360(text,text,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_communication_incident_360(text,text,text,text,uuid,uuid,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_communications_release_gate_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_communication_certification_360(text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_communication_incident_360(text,text,text,text,uuid,uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_communications_release_gate_360() TO authenticated;

COMMENT ON TABLE public.communication_certification_runs IS 'Canonical evidence ledger for communications UAT, security certification and release readiness.';
COMMENT ON TABLE public.communication_incident_events IS 'Canonical communications failure/recovery incident ledger.';
