-- Operation 11 — Business Continuity & Disaster Recovery 360
-- Recovery plans, drill evidence and recovery checkpoints without pretending provider backups are application-owned.

CREATE TABLE IF NOT EXISTS public.business_continuity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('platform','database','payments','communications','fulfillment','supply_chain','customer_service','security','other')),
  criticality text NOT NULL CHECK (criticality IN ('tier_1','tier_2','tier_3')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 180),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rto_minutes integer NOT NULL CHECK (rto_minutes > 0),
  rpo_minutes integer NOT NULL CHECK (rpo_minutes >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','needs_review','retired')),
  recovery_procedure text NOT NULL CHECK (length(trim(recovery_procedure)) >= 20),
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recovery_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.business_continuity_plans(id) ON DELETE CASCADE,
  drill_type text NOT NULL CHECK (drill_type IN ('tabletop','restore','failover','communications','full_recovery')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','passed','failed','cancelled')),
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  outcome text,
  evidence_reference text,
  issues_found integer NOT NULL DEFAULT 0 CHECK (issues_found >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recovery_drills_completion_consistency CHECK ((status IN ('passed','failed','cancelled') AND completed_at IS NOT NULL) OR status IN ('planned','in_progress'))
);

CREATE TABLE IF NOT EXISTS public.recovery_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.business_continuity_plans(id) ON DELETE CASCADE,
  checkpoint_type text NOT NULL CHECK (checkpoint_type IN ('backup_evidence','restore_test','dependency_check','credential_recovery','contact_verification','runbook_review')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bcp_status_review ON public.business_continuity_plans(status, next_review_at);
CREATE INDEX IF NOT EXISTS idx_recovery_drills_plan_status ON public.recovery_drills(plan_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_checkpoints_plan_verified ON public.recovery_checkpoints(plan_id, verified_at DESC);

ALTER TABLE public.business_continuity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_continuity_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.recovery_drills FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.recovery_checkpoints FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_business_continuity_plan(
  p_domain text, p_criticality text, p_title text, p_owner_id uuid,
  p_rto_minutes integer, p_rpo_minutes integer, p_recovery_procedure text,
  p_next_review_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('settings','update'); v_id uuid;
BEGIN
  IF p_domain NOT IN ('platform','database','payments','communications','fulfillment','supply_chain','customer_service','security','other') THEN RAISE EXCEPTION 'Invalid continuity domain'; END IF;
  IF p_criticality NOT IN ('tier_1','tier_2','tier_3') THEN RAISE EXCEPTION 'Invalid criticality'; END IF;
  IF length(trim(coalesce(p_title,''))) < 3 THEN RAISE EXCEPTION 'Continuity plan title is required'; END IF;
  IF p_rto_minutes IS NULL OR p_rto_minutes <= 0 OR p_rpo_minutes IS NULL OR p_rpo_minutes < 0 THEN RAISE EXCEPTION 'Invalid RTO/RPO'; END IF;
  IF length(trim(coalesce(p_recovery_procedure,''))) < 20 THEN RAISE EXCEPTION 'Recovery procedure is required'; END IF;
  INSERT INTO public.business_continuity_plans(domain,criticality,title,owner_id,rto_minutes,rpo_minutes,recovery_procedure,next_review_at,last_reviewed_at,status,created_by)
  VALUES(p_domain,p_criticality,trim(p_title),p_owner_id,p_rto_minutes,p_rpo_minutes,trim(p_recovery_procedure),p_next_review_at,now(),'active',v_user) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status','active');
END; $$;

CREATE OR REPLACE FUNCTION public.record_recovery_drill(
  p_plan_id uuid, p_drill_type text, p_scheduled_at timestamptz,
  p_status text DEFAULT 'planned', p_outcome text DEFAULT NULL,
  p_evidence_reference text DEFAULT NULL, p_issues_found integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('settings','update'); v_id uuid; v_completed timestamptz;
BEGIN
  PERFORM 1 FROM public.business_continuity_plans WHERE id=p_plan_id AND status <> 'retired';
  IF NOT FOUND THEN RAISE EXCEPTION 'Continuity plan not found or retired'; END IF;
  IF p_drill_type NOT IN ('tabletop','restore','failover','communications','full_recovery') THEN RAISE EXCEPTION 'Invalid drill type'; END IF;
  IF p_status NOT IN ('planned','in_progress','passed','failed','cancelled') THEN RAISE EXCEPTION 'Invalid drill status'; END IF;
  IF p_issues_found IS NULL OR p_issues_found < 0 THEN RAISE EXCEPTION 'Invalid issue count'; END IF;
  IF p_status IN ('passed','failed','cancelled') AND NULLIF(trim(coalesce(p_outcome,'')),'') IS NULL THEN RAISE EXCEPTION 'Completed drills require an outcome'; END IF;
  v_completed := CASE WHEN p_status IN ('passed','failed','cancelled') THEN now() ELSE NULL END;
  INSERT INTO public.recovery_drills(plan_id,drill_type,status,scheduled_at,started_at,completed_at,outcome,evidence_reference,issues_found,created_by)
  VALUES(p_plan_id,p_drill_type,p_status,p_scheduled_at,CASE WHEN p_status <> 'planned' THEN now() END,v_completed,NULLIF(trim(p_outcome),''),NULLIF(trim(p_evidence_reference),''),p_issues_found,v_user)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status',p_status);
END; $$;

CREATE OR REPLACE FUNCTION public.record_recovery_checkpoint(
  p_plan_id uuid, p_checkpoint_type text, p_evidence_reference text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('settings','update'); v_id uuid;
BEGIN
  PERFORM 1 FROM public.business_continuity_plans WHERE id=p_plan_id AND status <> 'retired';
  IF NOT FOUND THEN RAISE EXCEPTION 'Continuity plan not found or retired'; END IF;
  IF p_checkpoint_type NOT IN ('backup_evidence','restore_test','dependency_check','credential_recovery','contact_verification','runbook_review') THEN RAISE EXCEPTION 'Invalid checkpoint type'; END IF;
  INSERT INTO public.recovery_checkpoints(plan_id,checkpoint_type,verified_by,evidence_reference,notes)
  VALUES(p_plan_id,p_checkpoint_type,v_user,NULLIF(trim(p_evidence_reference),''),NULLIF(trim(p_notes),'')) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'verified_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.get_business_continuity_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('reports','select'); v_metrics jsonb; v_plans jsonb;
BEGIN
  SELECT jsonb_build_object(
    'plans',count(*),
    'tier_1',count(*) FILTER (WHERE criticality='tier_1'),
    'active',count(*) FILTER (WHERE status='active'),
    'needs_review',count(*) FILTER (WHERE status='needs_review' OR (next_review_at IS NOT NULL AND next_review_at < now())),
    'drills_due', (SELECT count(*) FROM public.recovery_drills d WHERE d.status='planned' AND d.scheduled_at <= now()),
    'failed_drills', (SELECT count(*) FROM public.recovery_drills d WHERE d.status='failed' AND d.created_at >= now()-interval '90 days'),
    'checkpoint_evidence_90d', (SELECT count(*) FROM public.recovery_checkpoints c WHERE c.verified_at >= now()-interval '90 days')
  ) INTO v_metrics FROM public.business_continuity_plans WHERE status <> 'retired';

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'domain',p.domain,'criticality',p.criticality,'title',p.title,'owner_id',p.owner_id,
    'rto_minutes',p.rto_minutes,'rpo_minutes',p.rpo_minutes,'status',p.status,'last_reviewed_at',p.last_reviewed_at,
    'next_review_at',p.next_review_at,
    'latest_checkpoint_at',(SELECT max(c.verified_at) FROM public.recovery_checkpoints c WHERE c.plan_id=p.id),
    'latest_drill_status',(SELECT d.status FROM public.recovery_drills d WHERE d.plan_id=p.id ORDER BY d.scheduled_at DESC LIMIT 1)
  ) ORDER BY CASE p.criticality WHEN 'tier_1' THEN 1 WHEN 'tier_2' THEN 2 ELSE 3 END,p.next_review_at NULLS LAST,p.title),'[]'::jsonb)
  INTO v_plans FROM public.business_continuity_plans p WHERE p.status <> 'retired';
  RETURN jsonb_build_object('generated_at',now(),'viewer',v_user,'metrics',v_metrics,'plans',v_plans);
END; $$;

REVOKE ALL ON FUNCTION public.create_business_continuity_plan(text,text,text,uuid,integer,integer,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_business_continuity_plan(text,text,text,uuid,integer,integer,text,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.record_recovery_drill(uuid,text,timestamptz,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_recovery_drill(uuid,text,timestamptz,text,text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.record_recovery_checkpoint(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_recovery_checkpoint(uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_business_continuity_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_business_continuity_360() TO authenticated;

COMMENT ON TABLE public.business_continuity_plans IS 'Application-owned recovery plans and RTO/RPO targets; does not represent managed-provider backup completion.';
COMMENT ON TABLE public.recovery_drills IS 'Auditable recovery exercise records and evidence references.';
COMMENT ON TABLE public.recovery_checkpoints IS 'Evidence checkpoints for recovery readiness such as backup, restore and dependency verification.';
