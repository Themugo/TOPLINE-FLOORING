-- G-19 HSE operational integrity hardening.
-- Additive constraints to existing HSE RPC workflow; no site records are changed.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_hse_site_event_360(
 p_control_id uuid,p_event_type text,p_severity text,p_description text,p_immediate_control text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.hse_site_controls_360 WHERE id=p_control_id AND status='active') THEN
   RAISE EXCEPTION 'Active HSE site control not found';
 END IF;
 IF p_event_type NOT IN ('hazard','near_miss','incident','observation','toolbox_talk') THEN RAISE EXCEPTION 'Invalid event type'; END IF;
 IF p_severity NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid severity'; END IF;
 IF length(trim(coalesce(p_description,'')))<5 THEN RAISE EXCEPTION 'Description is required'; END IF;
 IF (p_event_type='incident' OR p_severity IN ('high','critical'))
    AND length(trim(coalesce(p_immediate_control,'')))<5 THEN
   RAISE EXCEPTION 'Immediate safety control (minimum 5 characters) is required for incidents and high/critical events';
 END IF;
 INSERT INTO public.hse_site_events_360(control_id,event_type,severity,description,reported_by,immediate_control,status)
 VALUES(p_control_id,p_event_type,p_severity,trim(p_description),v_actor,nullif(trim(coalesce(p_immediate_control,'')),''),CASE WHEN p_event_type='toolbox_talk' THEN 'resolved' ELSE 'open' END)
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'status',(SELECT status FROM public.hse_site_events_360 WHERE id=v_id));
END; $$;

CREATE OR REPLACE FUNCTION public.update_hse_event_360(
 p_event_id uuid,p_status text,p_immediate_control text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_actor uuid := private.require_staff_permission('projects','update'); v_event public.hse_site_events_360%rowtype;
BEGIN
 IF p_status NOT IN ('open','investigating','controlled','resolved','closed') THEN RAISE EXCEPTION 'Invalid HSE event status'; END IF;
 SELECT * INTO v_event FROM public.hse_site_events_360 WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'HSE event not found'; END IF;
 IF v_event.status IN ('resolved','closed') AND p_status NOT IN (v_event.status) THEN
   RAISE EXCEPTION 'Resolved or closed HSE events cannot be reopened or downgraded';
 END IF;
 IF (v_event.event_type='incident' OR v_event.severity IN ('high','critical'))
    AND p_status IN ('controlled','resolved','closed')
    AND length(trim(coalesce(p_immediate_control,v_event.immediate_control,'')))<5 THEN
   RAISE EXCEPTION 'Immediate safety control evidence is required before advancing this event';
 END IF;
 IF p_status='closed' AND EXISTS(
   SELECT 1 FROM public.hse_corrective_actions_360
   WHERE event_id=p_event_id AND status NOT IN ('verified','closed')
 ) THEN RAISE EXCEPTION 'All HSE corrective actions must be verified or closed before event closure'; END IF;
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
 IF v_action.status IN ('verified','closed') AND p_status NOT IN (v_action.status) THEN
   RAISE EXCEPTION 'Verified or closed corrective actions cannot be reopened or downgraded';
 END IF;
 IF p_status='verified' AND v_action.status<>'completed' THEN
   RAISE EXCEPTION 'Corrective action must be completed before independent verification';
 END IF;
 IF p_status='closed' AND v_action.status<>'verified' THEN
   RAISE EXCEPTION 'Corrective action must be verified before closure';
 END IF;
 IF p_status IN ('verified','closed') AND length(trim(coalesce(p_verification_notes,'')))<10 THEN
   RAISE EXCEPTION 'Verification notes are required';
 END IF;
 UPDATE public.hse_corrective_actions_360
 SET status=p_status,
     completed_at=CASE WHEN p_status IN ('completed','verified','closed') THEN coalesce(completed_at,now()) ELSE completed_at END,
     verified_by=CASE WHEN p_status IN ('verified','closed') THEN v_actor ELSE verified_by END,
     verified_at=CASE WHEN p_status IN ('verified','closed') THEN coalesce(verified_at,now()) ELSE verified_at END,
     verification_notes=CASE WHEN p_verification_notes IS NOT NULL THEN trim(p_verification_notes) ELSE verification_notes END
 WHERE id=p_action_id;
 RETURN jsonb_build_object('id',p_action_id,'status',p_status,'actor',v_actor);
END; $$;

COMMENT ON FUNCTION public.create_hse_site_event_360(uuid,text,text,text,text)
IS 'Records HSE events; incidents and high/critical events require an immediate-control record.';
COMMENT ON FUNCTION public.update_hse_event_360(uuid,text,text)
IS 'Prevents reopening resolved/closed events and requires immediate-control evidence before high-risk event progression.';
COMMENT ON FUNCTION public.update_hse_corrective_action_360(uuid,text,text)
IS 'Enforces completed -> independently verified -> closed; verified/closed actions cannot be reopened.';

COMMIT;
