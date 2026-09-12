-- Operation 10 — Reliability, Observability & Incident Response 360
-- Durable incident control, explicit ownership, and auditable operational response.

CREATE TABLE IF NOT EXISTS public.operational_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigated','resolved')),
  domain text NOT NULL CHECK (domain IN ('platform','database','payments','communications','fulfillment','supply_chain','customer_service','security','other')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 180),
  description text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  mitigated_at timestamptz,
  resolved_at timestamptz,
  resolution_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_incidents_resolution_consistency CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL) OR status <> 'resolved'
  )
);

CREATE INDEX IF NOT EXISTS idx_operational_incidents_status_severity
  ON public.operational_incidents(status, severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_incidents_domain
  ON public.operational_incidents(domain, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_incidents_owner
  ON public.operational_incidents(owner_id, status);

ALTER TABLE public.operational_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_incidents FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_operational_incident(
  p_severity text,
  p_domain text,
  p_title text,
  p_description text DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('settings','update');
  v_id uuid;
  v_incident bigint;
BEGIN
  IF p_severity NOT IN ('critical','high','medium','low') THEN RAISE EXCEPTION 'Invalid incident severity'; END IF;
  IF p_domain NOT IN ('platform','database','payments','communications','fulfillment','supply_chain','customer_service','security','other') THEN RAISE EXCEPTION 'Invalid incident domain'; END IF;
  IF length(trim(coalesce(p_title,''))) < 3 THEN RAISE EXCEPTION 'Incident title is required'; END IF;

  INSERT INTO public.operational_incidents(severity,domain,title,description,owner_id,metadata,created_by)
  VALUES (p_severity,p_domain,trim(p_title),NULLIF(trim(p_description),''),p_owner_id,coalesce(p_metadata,'{}'::jsonb),v_user)
  RETURNING id,incident_number INTO v_id,v_incident;

  RETURN jsonb_build_object('id',v_id,'incident_number',v_incident,'status','open');
END; $$;

CREATE OR REPLACE FUNCTION public.update_operational_incident(
  p_incident_id uuid,
  p_status text,
  p_owner_id uuid DEFAULT NULL,
  p_resolution_summary text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('settings','update');
  v_current public.operational_incidents%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_current FROM public.operational_incidents WHERE id=p_incident_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incident not found'; END IF;
  IF p_status NOT IN ('open','investigating','mitigated','resolved') THEN RAISE EXCEPTION 'Invalid incident status'; END IF;
  IF v_current.status='resolved' AND p_status <> 'resolved' THEN RAISE EXCEPTION 'Resolved incidents cannot be reopened'; END IF;
  IF p_status='resolved' AND NULLIF(trim(coalesce(p_resolution_summary,'')),'') IS NULL THEN RAISE EXCEPTION 'Resolution summary is required'; END IF;

  UPDATE public.operational_incidents
  SET status=p_status,
      owner_id=coalesce(p_owner_id,owner_id),
      acknowledged_at=CASE WHEN p_status IN ('investigating','mitigated','resolved') THEN coalesce(acknowledged_at,v_now) ELSE acknowledged_at END,
      mitigated_at=CASE WHEN p_status IN ('mitigated','resolved') THEN coalesce(mitigated_at,v_now) ELSE mitigated_at END,
      resolved_at=CASE WHEN p_status='resolved' THEN coalesce(resolved_at,v_now) ELSE resolved_at END,
      resolution_summary=CASE WHEN p_status='resolved' THEN NULLIF(trim(p_resolution_summary),'') ELSE resolution_summary END,
      updated_at=v_now
  WHERE id=p_incident_id;

  RETURN jsonb_build_object('id',p_incident_id,'status',p_status,'updated_by',v_user,'updated_at',v_now);
END; $$;

CREATE OR REPLACE FUNCTION public.get_reliability_operations_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('reports','select');
  v_days integer := greatest(1,least(coalesce(p_days,30),365));
  v_since timestamptz := now()-make_interval(days=>v_days);
  v_open jsonb;
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'open',count(*) FILTER (WHERE status <> 'resolved'),
    'critical_open',count(*) FILTER (WHERE status <> 'resolved' AND severity='critical'),
    'high_open',count(*) FILTER (WHERE status <> 'resolved' AND severity='high'),
    'resolved',count(*) FILTER (WHERE status='resolved'),
    'detected_period',count(*) FILTER (WHERE detected_at>=v_since),
    'unassigned_open',count(*) FILTER (WHERE status <> 'resolved' AND owner_id IS NULL),
    'oldest_open_hours',coalesce(round(extract(epoch from (now()-min(detected_at) FILTER (WHERE status <> 'resolved')))/3600.0,1),0)
  ) INTO v_metrics
  FROM public.operational_incidents;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'incident_number',incident_number,'severity',severity,'status',status,'domain',domain,
    'title',title,'description',description,'owner_id',owner_id,'detected_at',detected_at,
    'acknowledged_at',acknowledged_at,'mitigated_at',mitigated_at,'resolved_at',resolved_at,
    'resolution_summary',resolution_summary
  ) ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, detected_at DESC),'[]'::jsonb)
  INTO v_open
  FROM public.operational_incidents
  WHERE status <> 'resolved';

  RETURN jsonb_build_object('days',v_days,'generated_at',now(),'viewer',v_user,'metrics',v_metrics,'open_incidents',v_open);
END; $$;

REVOKE ALL ON FUNCTION public.create_operational_incident(text,text,text,text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_operational_incident(text,text,text,text,uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.update_operational_incident(uuid,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_operational_incident(uuid,text,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_reliability_operations_360(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_reliability_operations_360(integer) TO authenticated;

COMMENT ON TABLE public.operational_incidents IS 'Durable incident register for platform reliability and operational response. Mutations are RPC-only and authorization-controlled.';
