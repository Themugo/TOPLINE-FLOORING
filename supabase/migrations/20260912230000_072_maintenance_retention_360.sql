-- Phases 86–88: Preventive Maintenance, Renewal & Customer Retention 360.
-- Extends the canonical after-sales model; service_cases remain authoritative for reactive work.

CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  frequency_months integer NOT NULL CHECK (frequency_months BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','completed')),
  starts_on date NOT NULL,
  next_due_on date,
  last_serviced_on date,
  expires_on date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_plans_customer_idx ON public.maintenance_plans(customer_id, status, next_due_on);
CREATE INDEX IF NOT EXISTS maintenance_plans_due_idx ON public.maintenance_plans(status, next_due_on);
CREATE INDEX IF NOT EXISTS maintenance_plans_project_idx ON public.maintenance_plans(project_id);

CREATE TABLE IF NOT EXISTS public.maintenance_plan_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  service_case_id uuid REFERENCES public.service_cases(id) ON DELETE SET NULL,
  scheduled_for date NOT NULL,
  completed_on date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','missed')),
  assigned_to uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_plan_visits_plan_idx ON public.maintenance_plan_visits(plan_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS maintenance_plan_visits_schedule_idx ON public.maintenance_plan_visits(status, scheduled_for);

ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.maintenance_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.maintenance_plan_visits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.maintenance_plans, public.maintenance_plan_visits TO authenticated;

DROP POLICY IF EXISTS maintenance_plans_staff_select ON public.maintenance_plans;
CREATE POLICY maintenance_plans_staff_select ON public.maintenance_plans FOR SELECT TO authenticated
USING (private.current_user_has_permission('customers','select'));
DROP POLICY IF EXISTS maintenance_plan_visits_staff_select ON public.maintenance_plan_visits;
CREATE POLICY maintenance_plan_visits_staff_select ON public.maintenance_plan_visits FOR SELECT TO authenticated
USING (private.current_user_has_permission('customers','select'));

CREATE OR REPLACE FUNCTION public.create_maintenance_plan_360(
  p_customer_id uuid,
  p_name text,
  p_frequency_months integer,
  p_starts_on date,
  p_project_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_expires_on date DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid; v_number text; v_next date;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  IF p_customer_id IS NULL OR nullif(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Customer and plan name are required'; END IF;
  IF p_frequency_months NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Maintenance frequency must be 1–60 months'; END IF;
  IF p_expires_on IS NOT NULL AND p_expires_on < p_starts_on THEN RAISE EXCEPTION 'Expiry cannot precede start date'; END IF;
  v_next := p_starts_on;
  v_number := 'MP-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  INSERT INTO public.maintenance_plans(plan_number,customer_id,project_id,order_id,name,description,frequency_months,starts_on,next_due_on,expires_on,notes,created_by)
  VALUES(v_number,p_customer_id,p_project_id,p_order_id,trim(p_name),nullif(trim(p_description),''),p_frequency_months,p_starts_on,v_next,p_expires_on,nullif(trim(p_notes),''),v_user)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'plan_id',v_id,'plan_number',v_number,'next_due_on',v_next);
END; $$;

CREATE OR REPLACE FUNCTION public.schedule_maintenance_visit_360(
  p_plan_id uuid,
  p_scheduled_for date,
  p_assigned_to uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_plan public.maintenance_plans%ROWTYPE; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  SELECT * INTO v_plan FROM public.maintenance_plans WHERE id=p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Maintenance plan not found'; END IF;
  IF v_plan.status <> 'active' THEN RAISE EXCEPTION 'Only active maintenance plans can be scheduled'; END IF;
  IF p_scheduled_for < current_date THEN RAISE EXCEPTION 'Maintenance visit cannot be scheduled in the past'; END IF;
  IF v_plan.expires_on IS NOT NULL AND p_scheduled_for > v_plan.expires_on THEN RAISE EXCEPTION 'Visit is beyond the maintenance plan expiry date'; END IF;
  IF p_assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff_profiles s WHERE s.id=p_assigned_to AND COALESCE(s.is_active,true)) THEN RAISE EXCEPTION 'Assigned staff member is not active'; END IF;
  INSERT INTO public.maintenance_plan_visits(plan_id,scheduled_for,assigned_to,notes,created_by)
  VALUES(p_plan_id,p_scheduled_for,p_assigned_to,nullif(trim(p_notes),''),v_user) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'visit_id',v_id,'plan_id',p_plan_id,'scheduled_for',p_scheduled_for);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_maintenance_visit_360(
  p_visit_id uuid,
  p_completed_on date DEFAULT current_date,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_visit public.maintenance_plan_visits%ROWTYPE; v_plan public.maintenance_plans%ROWTYPE; v_next date;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  SELECT * INTO v_visit FROM public.maintenance_plan_visits WHERE id=p_visit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Maintenance visit not found'; END IF;
  IF v_visit.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Maintenance visit is already terminal'; END IF;
  IF p_completed_on < v_visit.scheduled_for THEN RAISE EXCEPTION 'Completion date cannot precede scheduled date'; END IF;
  SELECT * INTO v_plan FROM public.maintenance_plans WHERE id=v_visit.plan_id FOR UPDATE;
  UPDATE public.maintenance_plan_visits SET status='completed',completed_on=p_completed_on,notes=COALESCE(nullif(trim(p_notes),''),notes),updated_at=now() WHERE id=v_visit.id;
  v_next := (p_completed_on + make_interval(months => v_plan.frequency_months))::date;
  IF v_plan.expires_on IS NOT NULL AND v_next > v_plan.expires_on THEN v_next := NULL; END IF;
  UPDATE public.maintenance_plans SET last_serviced_on=p_completed_on,next_due_on=v_next,updated_at=now() WHERE id=v_plan.id;
  RETURN jsonb_build_object('success',true,'visit_id',v_visit.id,'plan_id',v_plan.id,'next_due_on',v_next);
END; $$;

CREATE OR REPLACE FUNCTION public.transition_maintenance_plan_360(p_plan_id uuid,p_status text,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_plan public.maintenance_plans%ROWTYPE;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  IF p_status NOT IN ('active','paused','cancelled','completed') THEN RAISE EXCEPTION 'Invalid maintenance plan status'; END IF;
  SELECT * INTO v_plan FROM public.maintenance_plans WHERE id=p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Maintenance plan not found'; END IF;
  IF v_plan.status IN ('cancelled','completed') AND p_status <> v_plan.status THEN RAISE EXCEPTION 'Terminal maintenance plans cannot be reopened'; END IF;
  UPDATE public.maintenance_plans SET status=p_status,notes=COALESCE(nullif(trim(p_notes),''),notes),updated_at=now() WHERE id=p_plan_id;
  RETURN jsonb_build_object('success',true,'plan_id',p_plan_id,'status',p_status);
END; $$;

CREATE OR REPLACE FUNCTION public.get_maintenance_operations_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_user uuid; v_metrics jsonb; v_plans jsonb; v_visits jsonb;
BEGIN
  v_user := private.require_staff_permission('customers','select');
  SELECT jsonb_build_object(
    'active_plans',count(*) FILTER (WHERE status='active'),
    'paused_plans',count(*) FILTER (WHERE status='paused'),
    'due_30_days',count(*) FILTER (WHERE status='active' AND next_due_on BETWEEN current_date AND current_date+30),
    'overdue',count(*) FILTER (WHERE status='active' AND next_due_on < current_date),
    'expiring_60_days',count(*) FILTER (WHERE status='active' AND expires_on BETWEEN current_date AND current_date+60)
  ) INTO v_metrics FROM public.maintenance_plans;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.next_due_on NULLS LAST, x.created_at DESC),'[]'::jsonb) INTO v_plans
  FROM (SELECT m.*,c.name customer_name,c.phone customer_phone,c.email customer_email FROM public.maintenance_plans m JOIN public.customers c ON c.id=m.customer_id) x;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.scheduled_for ASC),'[]'::jsonb) INTO v_visits
  FROM (SELECT v.*,m.plan_number,m.name plan_name,c.name customer_name FROM public.maintenance_plan_visits v JOIN public.maintenance_plans m ON m.id=v.plan_id JOIN public.customers c ON c.id=m.customer_id WHERE v.status IN ('scheduled','in_progress')) x;
  RETURN jsonb_build_object('checked_at',now(),'metrics',v_metrics,'plans',v_plans,'upcoming_visits',v_visits,'viewer',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.get_customer_maintenance_plans_360()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE cid uuid;
BEGIN
  cid := public.get_current_customer_id();
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  RETURN jsonb_build_object(
    'plans',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'plan_number',m.plan_number,'name',m.name,'description',m.description,'frequency_months',m.frequency_months,'status',m.status,'starts_on',m.starts_on,'next_due_on',m.next_due_on,'last_serviced_on',m.last_serviced_on,'expires_on',m.expires_on) ORDER BY m.next_due_on NULLS LAST,m.created_at DESC) FROM public.maintenance_plans m WHERE m.customer_id=cid),'[]'::jsonb),
    'visits',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'plan_id',v.plan_id,'plan_number',m.plan_number,'scheduled_for',v.scheduled_for,'completed_on',v.completed_on,'status',v.status,'notes',v.notes) ORDER BY v.scheduled_for DESC) FROM public.maintenance_plan_visits v JOIN public.maintenance_plans m ON m.id=v.plan_id WHERE m.customer_id=cid),'[]'::jsonb)
  );
END; $$;

REVOKE ALL ON FUNCTION public.create_maintenance_plan_360(uuid,text,integer,date,uuid,uuid,text,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.schedule_maintenance_visit_360(uuid,date,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.complete_maintenance_visit_360(uuid,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.transition_maintenance_plan_360(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_maintenance_operations_360() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_maintenance_plans_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_maintenance_plan_360(uuid,text,integer,date,uuid,uuid,text,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_maintenance_visit_360(uuid,date,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_visit_360(uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_maintenance_plan_360(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_maintenance_operations_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_maintenance_plans_360() TO authenticated;

CREATE OR REPLACE FUNCTION public.maintenance_plans_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_maintenance_plans_updated_at ON public.maintenance_plans;
CREATE TRIGGER trg_maintenance_plans_updated_at BEFORE UPDATE ON public.maintenance_plans FOR EACH ROW EXECUTE FUNCTION public.maintenance_plans_updated_at();
DROP TRIGGER IF EXISTS trg_maintenance_plan_visits_updated_at ON public.maintenance_plan_visits;
CREATE TRIGGER trg_maintenance_plan_visits_updated_at BEFORE UPDATE ON public.maintenance_plan_visits FOR EACH ROW EXECUTE FUNCTION public.maintenance_plans_updated_at();
