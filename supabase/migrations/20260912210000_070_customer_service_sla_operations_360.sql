-- Phases 80–82: Customer Service SLA & After-Sales Operations 360
-- Server-authoritative service-case lifecycle, SLA tracking and audit history.

ALTER TABLE public.service_cases
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_customer_update_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 3);

CREATE INDEX IF NOT EXISTS service_cases_sla_open_idx
  ON public.service_cases(sla_due_at, priority)
  WHERE status NOT IN ('resolved','closed','rejected');

CREATE TABLE IF NOT EXISTS public.service_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.service_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','status_changed','assigned','priority_changed','escalated','customer_updated','resolved','closed','rejected')),
  from_status text,
  to_status text,
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_case_events_case_idx ON public.service_case_events(case_id, created_at DESC);

ALTER TABLE public.service_case_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_case_events FROM anon, authenticated;
GRANT SELECT ON public.service_case_events TO authenticated;
DROP POLICY IF EXISTS service_case_events_staff_read ON public.service_case_events;
CREATE POLICY service_case_events_staff_read ON public.service_case_events FOR SELECT TO authenticated
USING (private.current_user_has_permission('customers','select'));

CREATE OR REPLACE FUNCTION public.service_case_sla_hours(p_priority text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public,private AS $$
  SELECT CASE p_priority WHEN 'critical' THEN 4 WHEN 'high' THEN 8 WHEN 'medium' THEN 24 ELSE 48 END;
$$;
REVOKE ALL ON FUNCTION public.service_case_sla_hours(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.transition_service_case_360(
  p_case_id uuid,
  p_status text,
  p_priority text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_scheduled_date date DEFAULT NULL,
  p_resolution text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid; v_case public.service_cases%ROWTYPE; v_priority text; v_sla timestamptz;
  v_customer_update boolean := false;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  SELECT * INTO v_case FROM public.service_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service case not found'; END IF;
  IF p_status NOT IN ('open','in_review','scheduled','in_progress','resolved','closed','rejected') THEN RAISE EXCEPTION 'Invalid service case status'; END IF;
  v_priority := COALESCE(p_priority, v_case.priority);
  IF v_priority NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid service case priority'; END IF;
  IF v_case.status IN ('closed','rejected') AND p_status <> v_case.status THEN RAISE EXCEPTION 'Terminal service cases cannot be reopened'; END IF;
  IF p_status IN ('scheduled','in_progress') AND COALESCE(p_assigned_to,v_case.assigned_to) IS NULL THEN RAISE EXCEPTION 'An assigned staff member is required'; END IF;
  IF p_status='resolved' AND nullif(trim(COALESCE(p_resolution,v_case.resolution,'')),'') IS NULL THEN RAISE EXCEPTION 'Resolution is required before resolving a case'; END IF;
  IF p_status='closed' AND v_case.status <> 'resolved' THEN RAISE EXCEPTION 'Only resolved service cases can be closed'; END IF;
  IF p_scheduled_date IS NOT NULL AND p_scheduled_date < current_date AND p_status IN ('scheduled','in_progress') THEN RAISE EXCEPTION 'Scheduled date cannot be in the past'; END IF;

  IF v_case.sla_due_at IS NULL THEN
    v_sla := v_case.reported_at + make_interval(hours => public.service_case_sla_hours(v_priority));
  ELSE
    v_sla := v_case.sla_due_at;
  END IF;

  IF p_status <> v_case.status OR v_priority <> v_case.priority THEN
    INSERT INTO public.service_case_events(case_id,event_type,from_status,to_status,note,actor_id)
    VALUES(p_case_id,'status_changed',v_case.status,p_status,nullif(trim(p_note),''),v_user);
  ELSIF p_note IS NOT NULL THEN
    INSERT INTO public.service_case_events(case_id,event_type,note,actor_id)
    VALUES(p_case_id,'customer_updated',nullif(trim(p_note),''),v_user);
    v_customer_update := true;
  END IF;

  IF p_assigned_to IS DISTINCT FROM v_case.assigned_to AND p_assigned_to IS NOT NULL THEN
    INSERT INTO public.service_case_events(case_id,event_type,note,actor_id)
    VALUES(p_case_id,'assigned','Assigned to staff member',v_user);
  END IF;
  IF v_priority <> v_case.priority THEN
    INSERT INTO public.service_case_events(case_id,event_type,note,actor_id)
    VALUES(p_case_id,'priority_changed',v_case.priority||' → '||v_priority,v_user);
  END IF;
  IF p_status='resolved' AND v_case.status <> 'resolved' THEN
    INSERT INTO public.service_case_events(case_id,event_type,to_status,note,actor_id)
    VALUES(p_case_id,'resolved','resolved',nullif(trim(COALESCE(p_resolution,'Resolution recorded')), ''),v_user);
  END IF;
  IF p_status='closed' AND v_case.status <> 'closed' THEN
    INSERT INTO public.service_case_events(case_id,event_type,to_status,note,actor_id)
    VALUES(p_case_id,'closed','closed',nullif(trim(p_note),''),v_user);
  END IF;

  UPDATE public.service_cases
  SET status=p_status,
      priority=v_priority,
      assigned_to=COALESCE(p_assigned_to,assigned_to),
      scheduled_date=COALESCE(p_scheduled_date,scheduled_date),
      resolution=COALESCE(NULLIF(trim(p_resolution),''),resolution),
      sla_due_at=v_sla,
      first_response_at=CASE WHEN first_response_at IS NULL AND p_status <> 'open' THEN now() ELSE first_response_at END,
      last_customer_update_at=CASE WHEN v_customer_update THEN now() ELSE last_customer_update_at END,
      resolved_at=CASE WHEN p_status='resolved' THEN COALESCE(resolved_at,now()) ELSE resolved_at END,
      closed_at=CASE WHEN p_status='closed' THEN COALESCE(closed_at,now()) ELSE closed_at END,
      escalation_level=CASE WHEN v_sla < now() AND p_status NOT IN ('resolved','closed','rejected') THEN LEAST(escalation_level+1,3) ELSE escalation_level END,
      updated_at=now()
  WHERE id=p_case_id;

  RETURN jsonb_build_object('success',true,'case_id',p_case_id,'status',p_status,'priority',v_priority,'sla_due_at',v_sla,'escalation_level',(SELECT escalation_level FROM public.service_cases WHERE id=p_case_id));
END; $$;

CREATE OR REPLACE FUNCTION public.get_service_case_operations_360(p_case_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_case jsonb; v_metrics jsonb; v_events jsonb;
BEGIN
  v_user := private.require_staff_permission('customers','select');
  SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) INTO v_case
  FROM (
    SELECT s.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
           p.title AS project_title, o.order_number
    FROM public.service_cases s
    JOIN public.customers c ON c.id=s.customer_id
    LEFT JOIN public.projects p ON p.id=s.project_id
    LEFT JOIN public.orders o ON o.id=s.order_id
    WHERE p_case_id IS NULL OR s.id=p_case_id
  ) x;
  SELECT jsonb_build_object(
    'open',count(*) FILTER (WHERE status='open'),
    'in_review',count(*) FILTER (WHERE status='in_review'),
    'scheduled',count(*) FILTER (WHERE status='scheduled'),
    'in_progress',count(*) FILTER (WHERE status='in_progress'),
    'overdue',count(*) FILTER (WHERE status NOT IN ('resolved','closed','rejected') AND sla_due_at < now()),
    'critical',count(*) FILTER (WHERE priority='critical' AND status NOT IN ('resolved','closed','rejected'))
  ) INTO v_metrics FROM public.service_cases;
  IF p_case_id IS NOT NULL THEN
    SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC) INTO v_events FROM public.service_case_events e WHERE e.case_id=p_case_id;
  END IF;
  RETURN jsonb_build_object('checked_at',now(),'cases',COALESCE(v_case,'[]'::jsonb),'metrics',v_metrics,'events',COALESCE(v_events,'[]'::jsonb),'viewer',v_user);
END; $$;

REVOKE ALL ON FUNCTION public.transition_service_case_360(uuid,text,text,uuid,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_service_case_360(uuid,text,text,uuid,date,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_service_case_operations_360(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_case_operations_360(uuid) TO authenticated;

-- Backfill SLA timestamps for existing cases without changing lifecycle state.
UPDATE public.service_cases
SET sla_due_at = reported_at + make_interval(hours => public.service_case_sla_hours(priority))
WHERE sla_due_at IS NULL;
