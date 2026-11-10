-- G-19 follow-up: expose recorded safety evidence in the admin snapshot and validate accountable staff.
-- Additive RPC hardening only; no existing site, event, or action records are rewritten.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_hse_site_control_360(
 p_project_id uuid,p_title text,p_site_name text,p_risk_level text DEFAULT 'medium',p_responsible_id uuid DEFAULT NULL,
 p_induction_required boolean DEFAULT true,p_ppe_required text DEFAULT NULL,p_emergency_notes text DEFAULT NULL,p_review_due_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
BEGIN
 IF p_risk_level NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid risk level'; END IF;
 IF length(trim(coalesce(p_title,'')))<3 OR length(trim(coalesce(p_site_name,'')))<2 THEN RAISE EXCEPTION 'Title and site name are required'; END IF;
 IF p_project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
 IF p_responsible_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=p_responsible_id AND is_active=true) THEN RAISE EXCEPTION 'An active staff member must be assigned as responsible site safety owner'; END IF;
 IF length(trim(coalesce(p_ppe_required,'')))<3 THEN RAISE EXCEPTION 'PPE requirements or a documented not-applicable reason are required'; END IF;
 IF length(trim(coalesce(p_emergency_notes,'')))<5 THEN RAISE EXCEPTION 'Emergency arrangements are required'; END IF;
 IF p_review_due_at IS NULL OR p_review_due_at<=now() THEN RAISE EXCEPTION 'A future safety review date is required'; END IF;
 INSERT INTO public.hse_site_controls_360(project_id,title,site_name,risk_level,responsible_id,induction_required,ppe_required,emergency_notes,review_due_at)
 VALUES(p_project_id,trim(p_title),trim(p_site_name),p_risk_level,p_responsible_id,coalesce(p_induction_required,true),trim(p_ppe_required),trim(p_emergency_notes),p_review_due_at)
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'status','active','actor',v_actor);
END; $$;

CREATE OR REPLACE FUNCTION public.create_hse_corrective_action_360(
 p_event_id uuid,p_action_plan text,p_owner_id uuid DEFAULT NULL,p_due_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_event public.hse_site_events_360%rowtype; v_id uuid;
BEGIN
 SELECT * INTO v_event FROM public.hse_site_events_360 WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'HSE event not found'; END IF;
 IF v_event.status IN ('resolved','closed') THEN RAISE EXCEPTION 'Corrective actions cannot be added after an HSE event is resolved'; END IF;
 IF length(trim(coalesce(p_action_plan,'')))<10 THEN RAISE EXCEPTION 'Action plan is required'; END IF;
 IF p_owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=p_owner_id AND is_active=true) THEN RAISE EXCEPTION 'An active staff member must own every corrective action'; END IF;
 IF p_due_at IS NULL OR p_due_at<=now() THEN RAISE EXCEPTION 'A future due date is required for every corrective action'; END IF;
 INSERT INTO public.hse_corrective_actions_360(event_id,action_plan,owner_id,due_at)
 VALUES(p_event_id,trim(p_action_plan),p_owner_id,p_due_at) RETURNING id INTO v_id;
 IF v_event.status='open' THEN UPDATE public.hse_site_events_360 SET status='investigating' WHERE id=p_event_id; END IF;
 RETURN jsonb_build_object('id',v_id,'status','open','actor',v_actor);
END; $$;

CREATE OR REPLACE FUNCTION public.get_hse_site_compliance_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','select');
BEGIN
 RETURN jsonb_build_object(
  'generated_at',now(),'viewer',v_actor,
  'metrics',jsonb_build_object(
   'sites_total',(SELECT count(*) FROM public.hse_site_controls_360),
   'high_risk_sites',(SELECT count(*) FROM public.hse_site_controls_360 WHERE risk_level IN ('high','critical') AND status='active'),
   'open_events',(SELECT count(*) FROM public.hse_site_events_360 WHERE status NOT IN ('resolved','closed')),
   'critical_events',(SELECT count(*) FROM public.hse_site_events_360 WHERE severity='critical' AND status NOT IN ('resolved','closed')),
   'overdue_actions',(SELECT count(*) FROM public.hse_corrective_actions_360 WHERE status NOT IN ('verified','closed') AND due_at IS NOT NULL AND due_at<now()),
   'review_due_sites',(SELECT count(*) FROM public.hse_site_controls_360 WHERE status='active' AND review_due_at IS NOT NULL AND review_due_at<=now()+interval '30 days')
  ),
  'sites',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) FROM (
    SELECT c.id,c.created_at,c.project_id,c.title,c.site_name,c.risk_level,c.status,c.responsible_id,sp.display_name responsible_name,
           c.induction_required,c.ppe_required,c.emergency_notes,c.review_due_at
    FROM public.hse_site_controls_360 c LEFT JOIN public.staff_profiles sp ON sp.user_id=c.responsible_id
    ORDER BY c.created_at DESC LIMIT 50
  ) x),
  'events',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.occurred_at DESC),'[]'::jsonb) FROM (
    SELECT e.id,e.control_id,e.event_type,e.severity,e.description,e.immediate_control,e.reported_by,e.status,e.occurred_at,
           c.site_name,c.title control_title
    FROM public.hse_site_events_360 e JOIN public.hse_site_controls_360 c ON c.id=e.control_id
    WHERE e.status<>'closed' ORDER BY e.occurred_at DESC LIMIT 100
  ) x),
  'actions',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.due_at NULLS LAST,x.created_at DESC),'[]'::jsonb) FROM (
    SELECT a.id,a.created_at,a.event_id,a.action_plan,a.owner_id,owner.display_name owner_name,a.due_at,a.status,
           a.verified_by,verifier.display_name verifier_name,a.verified_at,a.verification_notes,e.description event_description
    FROM public.hse_corrective_actions_360 a JOIN public.hse_site_events_360 e ON e.id=a.event_id
    LEFT JOIN public.staff_profiles owner ON owner.user_id=a.owner_id
    LEFT JOIN public.staff_profiles verifier ON verifier.user_id=a.verified_by
    WHERE a.status<>'closed' ORDER BY a.due_at NULLS LAST,a.created_at DESC LIMIT 100
  ) x)
 );
END; $$;

COMMENT ON FUNCTION public.get_hse_site_compliance_360()
IS 'Returns HSE site ownership, emergency/PPE readiness, immediate-control evidence, corrective-action ownership and independent verification evidence to authorized staff.';

REVOKE ALL ON FUNCTION public.create_hse_site_control_360(uuid,text,text,text,uuid,boolean,text,text,timestamptz) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_hse_corrective_action_360(uuid,text,uuid,timestamptz) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_hse_site_compliance_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_hse_site_control_360(uuid,text,text,text,uuid,boolean,text,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_hse_corrective_action_360(uuid,text,uuid,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hse_site_compliance_360() TO authenticated;

COMMIT;
