-- Operation 6: Customer Lifecycle 360
-- Unifies reactive service, SLA, warranty, feedback, maintenance and renewal
-- into one server-authoritative after-sales customer lifecycle.

CREATE TABLE IF NOT EXISTS public.customer_after_sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('reconciled','service_opened','service_resolved','maintenance_due','maintenance_completed','renewal_created','renewal_won')),
  service_case_id uuid REFERENCES public.service_cases(id) ON DELETE SET NULL,
  maintenance_plan_id uuid REFERENCES public.maintenance_plans(id) ON DELETE SET NULL,
  renewal_opportunity_id uuid REFERENCES public.customer_renewal_opportunities(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_after_sales_events_customer_idx ON public.customer_after_sales_events(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_after_sales_events_type_idx ON public.customer_after_sales_events(event_type, created_at DESC);

ALTER TABLE public.customer_after_sales_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_after_sales_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_after_sales_events TO authenticated;
DROP POLICY IF EXISTS customer_after_sales_events_staff_read ON public.customer_after_sales_events;
CREATE POLICY customer_after_sales_events_staff_read ON public.customer_after_sales_events FOR SELECT TO authenticated
USING (private.current_user_has_permission('customers','select'));
DROP POLICY IF EXISTS customer_after_sales_events_customer_read ON public.customer_after_sales_events;
CREATE POLICY customer_after_sales_events_customer_read ON public.customer_after_sales_events FOR SELECT TO authenticated
USING (customer_id = public.get_current_customer_id());

CREATE OR REPLACE FUNCTION public.reconcile_customer_lifecycle_360()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','update');
  v_sla jsonb;
  v_renewal jsonb;
  v_warranty_count integer := 0;
  v_missed_count integer := 0;
  v_due_count integer := 0;
BEGIN
  v_sla := public.reconcile_service_case_slas_360();

  FOR r IN
    SELECT s.id, s.customer_id
    FROM public.service_cases s
    WHERE s.type = 'warranty'
      AND s.status NOT IN ('rejected')
      AND (s.warranty_valid IS NULL OR s.warranty_end IS NULL OR s.warranty_end >= s.reported_at::date)
  LOOP
    PERFORM public.refresh_service_case_warranty_360(r.id);
    v_warranty_count := v_warranty_count + 1;
  END LOOP;

  WITH changed AS (
    UPDATE public.maintenance_plan_visits v
    SET status = 'missed', updated_at = now()
    WHERE v.status = 'scheduled' AND v.scheduled_for < current_date
    RETURNING v.id
  )
  SELECT count(*) INTO v_missed_count FROM changed;

  SELECT count(*) INTO v_due_count
  FROM public.maintenance_plans m
  WHERE m.status = 'active'
    AND m.next_due_on IS NOT NULL
    AND m.next_due_on <= current_date + 30;

  v_renewal := public.refresh_customer_renewal_opportunities_360();

  INSERT INTO public.customer_after_sales_events(customer_id,event_type,details,actor_user_id)
  SELECT m.customer_id,'maintenance_due',jsonb_build_object('next_due_on',m.next_due_on),v_user
  FROM public.maintenance_plans m
  WHERE m.status='active' AND m.next_due_on = current_date;

  INSERT INTO public.customer_after_sales_events(customer_id,event_type,details,actor_user_id)
  SELECT o.customer_id,'renewal_created',jsonb_build_object('renewal_due_on',o.renewal_due_on,'priority',o.priority),v_user
  FROM public.customer_renewal_opportunities o
  WHERE o.created_at >= now() - interval '1 minute';

  RETURN jsonb_build_object(
    'success',true,
    'checked_at',now(),
    'sla',v_sla,
    'warranty_cases_checked',v_warranty_count,
    'maintenance_visits_marked_missed',v_missed_count,
    'maintenance_plans_due_30_days',v_due_count,
    'renewals',v_renewal
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_customer_lifecycle_360(p_customer_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := auth.uid();
  v_customer_id uuid;
  v_customer jsonb;
  v_summary jsonb;
  v_cases jsonb;
  v_feedback jsonb;
  v_maintenance jsonb;
  v_visits jsonb;
  v_renewals jsonb;
  v_events jsonb;
BEGIN
  IF private.current_user_is_staff() THEN
    PERFORM private.require_staff_permission('customers','select');
    v_customer_id := p_customer_id;
  ELSE
    v_customer_id := public.get_current_customer_id();
    IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
    IF p_customer_id IS NOT NULL AND p_customer_id <> v_customer_id THEN RAISE EXCEPTION 'Customer access denied'; END IF;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    SELECT to_jsonb(c) INTO v_customer FROM public.customers c WHERE c.id=v_customer_id;
    IF v_customer IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  END IF;

  SELECT jsonb_build_object(
    'service_cases', count(*) FILTER (WHERE s.status NOT IN ('resolved','closed','rejected')),
    'overdue_cases', count(*) FILTER (WHERE s.status NOT IN ('resolved','closed','rejected') AND s.sla_due_at < now()),
    'warranty_active', count(*) FILTER (WHERE s.type='warranty' AND s.warranty_valid=true AND s.warranty_end >= current_date),
    'feedback_average', COALESCE(round(avg(f.rating)::numeric,2),0),
    'maintenance_active', (SELECT count(*) FROM public.maintenance_plans m WHERE m.status='active' AND (v_customer_id IS NULL OR m.customer_id=v_customer_id)),
    'maintenance_due_30_days', (SELECT count(*) FROM public.maintenance_plans m WHERE m.status='active' AND m.next_due_on BETWEEN current_date AND current_date+30 AND (v_customer_id IS NULL OR m.customer_id=v_customer_id)),
    'renewals_open', (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.status IN ('open','contacted') AND (v_customer_id IS NULL OR o.customer_id=v_customer_id)),
    'renewals_overdue', (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.status IN ('open','contacted') AND o.renewal_due_on < current_date AND (v_customer_id IS NULL OR o.customer_id=v_customer_id))
  ) INTO v_summary
  FROM public.service_cases s
  LEFT JOIN public.service_case_feedback f ON f.case_id=s.id
  WHERE v_customer_id IS NULL OR s.customer_id=v_customer_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.reported_at DESC),'[]'::jsonb) INTO v_cases
  FROM (
    SELECT s.id,s.case_number,s.type,s.status,s.priority,s.issue_title,s.description,s.reported_at,s.sla_due_at,s.escalation_level,s.warranty_start,s.warranty_end,s.warranty_valid,s.resolution,s.resolved_at,s.closed_at
    FROM public.service_cases s
    WHERE v_customer_id IS NULL OR s.customer_id=v_customer_id
    ORDER BY s.reported_at DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_feedback
  FROM (
    SELECT f.id,f.case_id,f.rating,f.outcome,f.comment,f.created_at,s.case_number,s.issue_title
    FROM public.service_case_feedback f JOIN public.service_cases s ON s.id=f.case_id
    WHERE v_customer_id IS NULL OR f.customer_id=v_customer_id
    ORDER BY f.created_at DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.next_due_on NULLS LAST,x.created_at DESC),'[]'::jsonb) INTO v_maintenance
  FROM (
    SELECT m.id,m.plan_number,m.name,m.description,m.frequency_months,m.status,m.starts_on,m.next_due_on,m.last_serviced_on,m.expires_on
    FROM public.maintenance_plans m WHERE v_customer_id IS NULL OR m.customer_id=v_customer_id
    ORDER BY m.next_due_on NULLS LAST,m.created_at DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.scheduled_for DESC),'[]'::jsonb) INTO v_visits
  FROM (
    SELECT v.id,v.plan_id,m.plan_number,m.name AS plan_name,v.scheduled_for,v.completed_on,v.status,v.notes
    FROM public.maintenance_plan_visits v JOIN public.maintenance_plans m ON m.id=v.plan_id
    WHERE v_customer_id IS NULL OR m.customer_id=v_customer_id
    ORDER BY v.scheduled_for DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.renewal_due_on ASC),'[]'::jsonb) INTO v_renewals
  FROM (
    SELECT o.id,o.maintenance_plan_id,o.renewal_due_on,o.status,o.priority,o.last_contacted_at,o.next_action_on,o.notes,m.plan_number,m.name AS plan_name
    FROM public.customer_renewal_opportunities o JOIN public.maintenance_plans m ON m.id=o.maintenance_plan_id
    WHERE (v_customer_id IS NULL OR o.customer_id=v_customer_id)
    ORDER BY o.renewal_due_on ASC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) INTO v_events
  FROM public.customer_after_sales_events e
  WHERE v_customer_id IS NULL OR e.customer_id=v_customer_id;

  RETURN jsonb_build_object(
    'checked_at',now(),
    'customer',COALESCE(v_customer,'null'::jsonb),
    'summary',v_summary,
    'service_cases',v_cases,
    'feedback',v_feedback,
    'maintenance_plans',v_maintenance,
    'maintenance_visits',v_visits,
    'renewals',v_renewals,
    'events',v_events,
    'viewer',v_user
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_customer_lifecycle_operations_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','select');
  v_metrics jsonb;
  v_customers jsonb;
BEGIN
  SELECT jsonb_build_object(
    'active_customers', (SELECT count(*) FROM public.customers),
    'open_service_cases', (SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected')),
    'overdue_service_cases', (SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected') AND sla_due_at < now()),
    'active_warranties', (SELECT count(*) FROM public.service_cases WHERE type='warranty' AND warranty_valid=true AND warranty_end >= current_date),
    'unverified_warranties', (SELECT count(*) FROM public.service_cases WHERE type='warranty' AND warranty_valid IS NULL),
    'low_feedback', (SELECT count(*) FROM public.service_case_feedback WHERE rating <= 2),
    'maintenance_due_30_days', (SELECT count(*) FROM public.maintenance_plans WHERE status='active' AND next_due_on BETWEEN current_date AND current_date+30),
    'maintenance_overdue', (SELECT count(*) FROM public.maintenance_plans WHERE status='active' AND next_due_on < current_date),
    'renewals_due_14_days', (SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on BETWEEN current_date AND current_date+14),
    'renewals_overdue', (SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on < current_date)
  ) INTO v_metrics;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.risk_score DESC,x.customer_name ASC),'[]'::jsonb) INTO v_customers
  FROM (
    SELECT c.id,c.name,c.email,c.phone,
      (SELECT count(*) FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected')) AS open_service_cases,
      (SELECT count(*) FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected') AND s.sla_due_at < now()) AS overdue_service_cases,
      (SELECT count(*) FROM public.maintenance_plans m WHERE m.customer_id=c.id AND m.status='active' AND m.next_due_on < current_date) AS overdue_maintenance,
      (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.customer_id=c.id AND o.status IN ('open','contacted') AND o.renewal_due_on < current_date) AS overdue_renewals,
      (SELECT count(*) FROM public.service_case_feedback f WHERE f.customer_id=c.id AND f.rating <= 2) AS low_feedback,
      (
        (SELECT count(*) FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected') AND s.sla_due_at < now()) * 4 +
        (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.customer_id=c.id AND o.status IN ('open','contacted') AND o.renewal_due_on < current_date) * 3 +
        (SELECT count(*) FROM public.maintenance_plans m WHERE m.customer_id=c.id AND m.status='active' AND m.next_due_on < current_date) * 2 +
        (SELECT count(*) FROM public.service_case_feedback f WHERE f.customer_id=c.id AND f.rating <= 2) * 2
      ) AS risk_score
    FROM public.customers c
    WHERE EXISTS (SELECT 1 FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected'))
       OR EXISTS (SELECT 1 FROM public.maintenance_plans m WHERE m.customer_id=c.id AND m.status='active')
       OR EXISTS (SELECT 1 FROM public.customer_renewal_opportunities o WHERE o.customer_id=c.id AND o.status IN ('open','contacted'))
    ORDER BY risk_score DESC,c.name ASC LIMIT 100
  ) x;

  RETURN jsonb_build_object('checked_at',now(),'metrics',v_metrics,'customers',v_customers,'viewer',v_user);
END; $$;

REVOKE ALL ON FUNCTION public.reconcile_customer_lifecycle_360() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_lifecycle_360(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_customer_lifecycle_operations_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_customer_lifecycle_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_lifecycle_360(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_lifecycle_operations_360() TO authenticated;
