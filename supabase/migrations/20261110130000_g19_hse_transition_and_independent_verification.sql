-- G-19 follow-up: enforce sequential HSE event/action transitions and independent verification.
-- Additive, transactional, and limited to HSE RPC behavior; no live site records are rewritten.
BEGIN;


CREATE OR REPLACE FUNCTION public.create_hse_site_control_360(
 p_project_id uuid,p_title text,p_site_name text,p_risk_level text DEFAULT 'medium',p_responsible_id uuid DEFAULT NULL,
 p_induction_required boolean DEFAULT true,p_ppe_required text DEFAULT NULL,p_emergency_notes text DEFAULT NULL,p_review_due_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
BEGIN
 IF p_risk_level NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid risk level'; END IF;
 IF length(trim(coalesce(p_title,'')))<3 OR length(trim(coalesce(p_site_name,'')))<2 THEN RAISE EXCEPTION 'Title and site name are required'; END IF;
 IF p_responsible_id IS NULL THEN RAISE EXCEPTION 'A responsible site safety owner is required'; END IF;
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
 IF p_owner_id IS NULL THEN RAISE EXCEPTION 'A responsible owner is required for every corrective action'; END IF;
 IF p_due_at IS NULL THEN RAISE EXCEPTION 'A due date is required for every corrective action'; END IF;
 INSERT INTO public.hse_corrective_actions_360(event_id,action_plan,owner_id,due_at)
 VALUES(p_event_id,trim(p_action_plan),p_owner_id,p_due_at) RETURNING id INTO v_id;
 IF v_event.status='open' THEN UPDATE public.hse_site_events_360 SET status='investigating' WHERE id=p_event_id; END IF;
 RETURN jsonb_build_object('id',v_id,'status','open','actor',v_actor);
END; $$;

CREATE OR REPLACE FUNCTION public.update_hse_event_360(
 p_event_id uuid,p_status text,p_immediate_control text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_event public.hse_site_events_360%rowtype;
BEGIN
 IF p_status NOT IN ('open','investigating','controlled','resolved','closed') THEN RAISE EXCEPTION 'Invalid HSE event status'; END IF;
 SELECT * INTO v_event FROM public.hse_site_events_360 WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'HSE event not found'; END IF;
 IF v_event.status='closed' AND p_status<>'closed' THEN RAISE EXCEPTION 'Closed HSE events cannot be reopened or downgraded'; END IF;
 IF p_status<>v_event.status AND NOT (
   (v_event.status='open' AND p_status='investigating') OR
   (v_event.status='investigating' AND p_status='controlled') OR
   (v_event.status='controlled' AND p_status='resolved') OR
   (v_event.status='resolved' AND p_status='closed')
 ) THEN RAISE EXCEPTION 'Invalid HSE event transition: % -> %',v_event.status,p_status; END IF;
 IF (v_event.event_type='incident' OR v_event.severity IN ('high','critical'))
    AND p_status IN ('controlled','resolved','closed')
    AND length(trim(coalesce(p_immediate_control,v_event.immediate_control,'')))<5 THEN
   RAISE EXCEPTION 'Immediate safety control evidence is required before advancing this event';
 END IF;
 IF p_status='closed' AND EXISTS (
   SELECT 1 FROM public.hse_corrective_actions_360 WHERE event_id=p_event_id AND status<>'closed'
 ) THEN RAISE EXCEPTION 'All HSE corrective actions must be closed before event closure'; END IF;
 UPDATE public.hse_site_events_360
 SET status=p_status,
     immediate_control=CASE WHEN p_immediate_control IS NOT NULL THEN nullif(trim(p_immediate_control),'') ELSE immediate_control END,
     closed_at=CASE WHEN p_status='closed' THEN coalesce(closed_at,now()) ELSE closed_at END
 WHERE id=p_event_id;
 RETURN jsonb_build_object('id',p_event_id,'status',p_status,'actor',v_actor);
END; $$;

CREATE OR REPLACE FUNCTION public.update_hse_corrective_action_360(
 p_action_id uuid,p_status text,p_verification_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_action public.hse_corrective_actions_360%rowtype;
BEGIN
 IF p_status NOT IN ('open','in_progress','blocked','completed','verified','closed') THEN RAISE EXCEPTION 'Invalid corrective action status'; END IF;
 SELECT * INTO v_action FROM public.hse_corrective_actions_360 WHERE id=p_action_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'HSE corrective action not found'; END IF;
 IF v_action.status='closed' AND p_status<>'closed' THEN RAISE EXCEPTION 'Closed corrective actions cannot be reopened or downgraded'; END IF;
 IF p_status<>v_action.status AND NOT (
   (v_action.status='open' AND p_status='in_progress') OR
   (v_action.status='in_progress' AND p_status IN ('blocked','completed')) OR
   (v_action.status='blocked' AND p_status='in_progress') OR
   (v_action.status='completed' AND p_status IN ('in_progress','verified')) OR
   (v_action.status='verified' AND p_status='closed')
 ) THEN RAISE EXCEPTION 'Invalid corrective action transition: % -> %',v_action.status,p_status; END IF;
 IF p_status='verified' THEN
   IF v_action.owner_id IS NULL THEN RAISE EXCEPTION 'Corrective action must have an owner before independent verification'; END IF;
   IF v_action.owner_id=v_actor THEN RAISE EXCEPTION 'Corrective action owner cannot independently verify their own work'; END IF;
   IF length(trim(coalesce(p_verification_notes,'')))<10 THEN RAISE EXCEPTION 'Verification notes are required'; END IF;
 END IF;
 IF p_status='closed' AND length(trim(coalesce(p_verification_notes,v_action.verification_notes,'')))<10 THEN
   RAISE EXCEPTION 'Verification notes are required before closure';
 END IF;
 UPDATE public.hse_corrective_actions_360
 SET status=p_status,
     completed_at=CASE WHEN p_status IN ('completed','verified','closed') THEN coalesce(completed_at,now()) ELSE completed_at END,
     verified_by=CASE WHEN p_status='verified' THEN v_actor ELSE verified_by END,
     verified_at=CASE WHEN p_status='verified' THEN now() ELSE verified_at END,
     verification_notes=CASE WHEN p_verification_notes IS NOT NULL THEN trim(p_verification_notes) ELSE verification_notes END
 WHERE id=p_action_id;
 RETURN jsonb_build_object('id',p_action_id,'status',p_status,'actor',v_actor);
END; $$;

COMMENT ON FUNCTION public.create_hse_site_control_360(uuid,text,text,text,uuid,boolean,text,text,timestamptz)
IS 'Requires a named safety owner, documented PPE requirements, emergency arrangements and a future review date.';
COMMENT ON FUNCTION public.create_hse_corrective_action_360(uuid,text,uuid,timestamptz)
IS 'Requires accountable owner and due date; locks the parent event and rejects actions after resolution.';
COMMENT ON FUNCTION public.update_hse_event_360(uuid,text,text)
IS 'Enforces sequential event progression, allows resolved-to-closed, and requires all corrective actions closed.';
COMMENT ON FUNCTION public.update_hse_corrective_action_360(uuid,text,text)
IS 'Enforces sequential action progression and independent verification by staff other than the assigned owner.';

COMMIT;
