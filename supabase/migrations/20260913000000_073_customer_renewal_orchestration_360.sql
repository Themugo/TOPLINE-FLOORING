-- Phases 89–91: Customer Renewal Orchestration 360.
-- Builds renewal opportunities from canonical maintenance plans without creating a second customer model.

CREATE TABLE IF NOT EXISTS public.customer_renewal_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_plan_id uuid NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  renewal_due_on date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','contacted','won','lost','dismissed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  last_contacted_at timestamptz,
  next_action_on date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (maintenance_plan_id)
);
CREATE INDEX IF NOT EXISTS renewal_opportunities_status_idx ON public.customer_renewal_opportunities(status, priority, renewal_due_on);
CREATE INDEX IF NOT EXISTS renewal_opportunities_customer_idx ON public.customer_renewal_opportunities(customer_id, status);

CREATE TABLE IF NOT EXISTS public.customer_renewal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.customer_renewal_opportunities(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS renewal_events_opportunity_idx ON public.customer_renewal_events(opportunity_id, created_at DESC);

ALTER TABLE public.customer_renewal_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_renewal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_renewal_opportunities, public.customer_renewal_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_renewal_opportunities, public.customer_renewal_events TO authenticated;
CREATE POLICY renewal_opportunities_staff_select ON public.customer_renewal_opportunities FOR SELECT TO authenticated USING (private.current_user_has_permission('customers','select'));
CREATE POLICY renewal_events_staff_select ON public.customer_renewal_events FOR SELECT TO authenticated USING (private.current_user_has_permission('customers','select'));

CREATE OR REPLACE FUNCTION public.refresh_customer_renewal_opportunities_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_created integer := 0; r record; v_priority text;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  FOR r IN SELECT m.id,m.customer_id,COALESCE(m.next_due_on,m.expires_on) due_on FROM public.maintenance_plans m WHERE m.status='active' AND COALESCE(m.next_due_on,m.expires_on) IS NOT NULL AND COALESCE(m.next_due_on,m.expires_on) <= current_date + 60 LOOP
    v_priority := CASE WHEN r.due_on < current_date THEN 'critical' WHEN r.due_on <= current_date+14 THEN 'high' ELSE 'normal' END;
    INSERT INTO public.customer_renewal_opportunities(maintenance_plan_id,customer_id,renewal_due_on,priority,created_by,next_action_on)
    VALUES(r.id,r.customer_id,r.due_on,v_priority,v_user,current_date)
    ON CONFLICT (maintenance_plan_id) DO UPDATE SET renewal_due_on=EXCLUDED.renewal_due_on, priority=CASE WHEN customer_renewal_opportunities.status IN ('won','lost','dismissed') THEN customer_renewal_opportunities.priority ELSE EXCLUDED.priority END, updated_at=now();
    IF FOUND THEN v_created := v_created + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('success',true,'processed',v_created,'checked_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.transition_customer_renewal_360(p_opportunity_id uuid,p_status text,p_next_action_on date DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; r public.customer_renewal_opportunities%ROWTYPE;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  IF p_status NOT IN ('open','contacted','won','lost','dismissed') THEN RAISE EXCEPTION 'Invalid renewal status'; END IF;
  SELECT * INTO r FROM public.customer_renewal_opportunities WHERE id=p_opportunity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Renewal opportunity not found'; END IF;
  IF r.status IN ('won','lost','dismissed') AND p_status <> r.status THEN RAISE EXCEPTION 'Terminal renewal opportunities cannot be reopened'; END IF;
  UPDATE public.customer_renewal_opportunities SET status=p_status,last_contacted_at=CASE WHEN p_status='contacted' THEN now() ELSE last_contacted_at END,next_action_on=p_next_action_on,notes=COALESCE(nullif(trim(p_notes),''),notes),updated_at=now() WHERE id=r.id;
  INSERT INTO public.customer_renewal_events(opportunity_id,event_type,from_status,to_status,details,actor_user_id) VALUES(r.id,'status_transition',r.status,p_status,jsonb_build_object('next_action_on',p_next_action_on),v_user);
  RETURN jsonb_build_object('success',true,'opportunity_id',r.id,'status',p_status);
END; $$;

CREATE OR REPLACE FUNCTION public.get_customer_renewal_operations_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_user uuid; v_metrics jsonb; v_rows jsonb;
BEGIN
  v_user := private.require_staff_permission('customers','select');
  SELECT jsonb_build_object('open',count(*) FILTER (WHERE status='open'),'contacted',count(*) FILTER (WHERE status='contacted'),'due_14_days',count(*) FILTER (WHERE status IN ('open','contacted') AND renewal_due_on BETWEEN current_date AND current_date+14),'overdue',count(*) FILTER (WHERE status IN ('open','contacted') AND renewal_due_on < current_date),'high_priority',count(*) FILTER (WHERE status IN ('open','contacted') AND priority IN ('high','critical'))) INTO v_metrics FROM public.customer_renewal_opportunities;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.priority DESC,x.renewal_due_on ASC),'[]'::jsonb) INTO v_rows FROM (SELECT o.*,c.name customer_name,c.phone customer_phone,c.email customer_email,m.plan_number,m.name plan_name FROM public.customer_renewal_opportunities o JOIN public.customers c ON c.id=o.customer_id JOIN public.maintenance_plans m ON m.id=o.maintenance_plan_id WHERE o.status IN ('open','contacted')) x;
  RETURN jsonb_build_object('checked_at',now(),'metrics',v_metrics,'opportunities',v_rows,'viewer',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.get_customer_renewal_history_360(p_opportunity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_user uuid; v_events jsonb;
BEGIN
  v_user := private.require_staff_permission('customers','select');
  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) INTO v_events FROM public.customer_renewal_events e WHERE e.opportunity_id=p_opportunity_id;
  RETURN jsonb_build_object('events',v_events,'viewer',v_user);
END; $$;

REVOKE ALL ON FUNCTION public.refresh_customer_renewal_opportunities_360() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.transition_customer_renewal_360(uuid,text,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_renewal_operations_360() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_renewal_history_360(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_customer_renewal_opportunities_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_customer_renewal_360(uuid,text,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_renewal_operations_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_renewal_history_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_renewal_opportunities_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_customer_renewal_opportunities_updated_at ON public.customer_renewal_opportunities;
CREATE TRIGGER trg_customer_renewal_opportunities_updated_at BEFORE UPDATE ON public.customer_renewal_opportunities FOR EACH ROW EXECUTE FUNCTION public.customer_renewal_opportunities_updated_at();
