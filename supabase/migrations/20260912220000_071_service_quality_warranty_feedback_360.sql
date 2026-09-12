-- Phases 83–85: Service Quality, Warranty Entitlement & Customer Feedback 360
-- Extends the after-sales foundation with deterministic SLA reconciliation,
-- warranty entitlement validation and customer satisfaction capture.

ALTER TABLE public.service_case_events
  DROP CONSTRAINT IF EXISTS service_case_events_event_type_check;
ALTER TABLE public.service_case_events
  ADD CONSTRAINT service_case_events_event_type_check CHECK (event_type IN (
    'created','status_changed','assigned','priority_changed','escalated',
    'customer_updated','resolved','closed','rejected','feedback_received','warranty_validated'
  ));

CREATE TABLE IF NOT EXISTS public.service_case_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES public.service_cases(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  outcome text NOT NULL DEFAULT 'satisfied' CHECK (outcome IN ('very_dissatisfied','dissatisfied','neutral','satisfied','very_satisfied')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_case_feedback_customer_idx ON public.service_case_feedback(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_case_feedback_rating_idx ON public.service_case_feedback(rating, created_at DESC);

ALTER TABLE public.service_case_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_case_feedback FROM anon, authenticated;
GRANT SELECT ON public.service_case_feedback TO authenticated;
DROP POLICY IF EXISTS service_case_feedback_staff_read ON public.service_case_feedback;
CREATE POLICY service_case_feedback_staff_read ON public.service_case_feedback FOR SELECT TO authenticated
USING (private.current_user_has_permission('customers','select'));
DROP POLICY IF EXISTS service_case_feedback_customer_read ON public.service_case_feedback;
CREATE POLICY service_case_feedback_customer_read ON public.service_case_feedback FOR SELECT TO authenticated
USING (customer_id = public.get_current_customer_id());

CREATE OR REPLACE FUNCTION public.submit_service_case_feedback(
  p_case_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := auth.uid();
  v_customer uuid;
  v_case public.service_cases%ROWTYPE;
  v_outcome text;
BEGIN
  SELECT * INTO v_case FROM public.service_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service case not found'; END IF;
  IF v_case.status NOT IN ('resolved','closed') THEN RAISE EXCEPTION 'Feedback is available after resolution'; END IF;

  v_customer := public.get_current_customer_id();
  IF v_customer IS NULL OR v_customer <> v_case.customer_id THEN RAISE EXCEPTION 'Customer access denied'; END IF;

  IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  v_outcome := CASE p_rating WHEN 1 THEN 'very_dissatisfied' WHEN 2 THEN 'dissatisfied' WHEN 3 THEN 'neutral' WHEN 4 THEN 'satisfied' ELSE 'very_satisfied' END;

  INSERT INTO public.service_case_feedback(case_id,customer_id,rating,outcome,comment)
  VALUES(p_case_id,v_customer,p_rating,v_outcome,nullif(trim(p_comment),''));

  INSERT INTO public.service_case_events(case_id,event_type,note,actor_id)
  VALUES(p_case_id,'feedback_received','Customer satisfaction feedback recorded',v_user);

  RETURN jsonb_build_object('success',true,'case_id',p_case_id,'rating',p_rating,'outcome',v_outcome);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Feedback has already been submitted for this service case';
END; $$;
REVOKE ALL ON FUNCTION public.submit_service_case_feedback(uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_service_case_feedback(uuid,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_service_case_slas_360()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','update');
  v_updated integer := 0;
BEGIN
  WITH target AS (
    SELECT s.id,
           CASE
             WHEN now() >= s.sla_due_at + make_interval(hours => public.service_case_sla_hours(s.priority) * 4) THEN 3
             WHEN now() >= s.sla_due_at + make_interval(hours => public.service_case_sla_hours(s.priority) * 2) THEN 2
             WHEN now() >= s.sla_due_at THEN 1
             ELSE 0
           END AS target_level
    FROM public.service_cases s
    WHERE s.status NOT IN ('resolved','closed','rejected')
      AND s.sla_due_at IS NOT NULL
  ), changed AS (
    UPDATE public.service_cases s
    SET escalation_level=t.target_level, updated_at=now()
    FROM target t
    WHERE s.id=t.id AND s.escalation_level IS DISTINCT FROM t.target_level
    RETURNING s.id, s.escalation_level
  )
  INSERT INTO public.service_case_events(case_id,event_type,note,actor_id)
  SELECT id,'escalated','SLA reconciliation raised escalation level to '||escalation_level,v_user FROM changed;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('success',true,'updated_cases',v_updated,'checked_at',now());
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_service_case_slas_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_service_case_slas_360() TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_service_case_warranty_360(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','update');
  v_case public.service_cases%ROWTYPE;
  v_years integer;
  v_start date;
  v_end date;
  v_valid boolean;
BEGIN
  SELECT * INTO v_case FROM public.service_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service case not found'; END IF;
  IF v_case.type <> 'warranty' THEN RAISE EXCEPTION 'Warranty validation applies only to warranty cases'; END IF;

  SELECT max(p.warranty_years) INTO v_years
  FROM public.order_items oi
  JOIN public.products p ON p.id=oi.product_id
  WHERE oi.order_id=v_case.order_id
    AND p.warranty_years IS NOT NULL;

  v_start := COALESCE((SELECT completion_date FROM public.projects WHERE id=v_case.project_id),
                      (SELECT project_date FROM public.projects WHERE id=v_case.project_id),
                      (SELECT created_at::date FROM public.orders WHERE id=v_case.order_id),
                      v_case.reported_at::date);
  v_end := CASE WHEN v_years IS NOT NULL THEN (v_start + make_interval(years => v_years))::date ELSE NULL END;
  v_valid := v_years IS NOT NULL AND v_case.reported_at::date BETWEEN v_start AND v_end;

  UPDATE public.service_cases
  SET warranty_start=v_start, warranty_end=v_end, warranty_valid=v_valid, updated_at=now()
  WHERE id=p_case_id;

  INSERT INTO public.service_case_events(case_id,event_type,note,actor_id)
  VALUES(p_case_id,'warranty_validated',CASE WHEN v_valid THEN 'Warranty entitlement validated' ELSE 'Warranty entitlement could not be validated as active' END,v_user);

  RETURN jsonb_build_object('success',true,'case_id',p_case_id,'warranty_years',v_years,'warranty_start',v_start,'warranty_end',v_end,'warranty_valid',v_valid);
END; $$;
REVOKE ALL ON FUNCTION public.refresh_service_case_warranty_360(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_service_case_warranty_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_service_case_quality_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','select');
  v_metrics jsonb;
  v_feedback jsonb;
BEGIN
  SELECT jsonb_build_object(
    'feedback_count', count(f.id),
    'average_rating', COALESCE(round(avg(f.rating)::numeric,2),0),
    'five_star_count', count(*) FILTER (WHERE f.rating=5),
    'low_rating_count', count(*) FILTER (WHERE f.rating <= 2),
    'warranty_valid', count(*) FILTER (WHERE s.type='warranty' AND s.warranty_valid=true),
    'warranty_invalid', count(*) FILTER (WHERE s.type='warranty' AND s.warranty_valid=false),
    'warranty_unverified', count(*) FILTER (WHERE s.type='warranty' AND s.warranty_valid IS NULL),
    'escalated_open', count(*) FILTER (WHERE s.escalation_level > 0 AND s.status NOT IN ('resolved','closed','rejected'))
  ) INTO v_metrics
  FROM public.service_cases s
  LEFT JOIN public.service_case_feedback f ON f.case_id=s.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_feedback
  FROM (
    SELECT f.id,f.case_id,s.case_number,c.name AS customer_name,f.rating,f.outcome,f.comment,f.created_at
    FROM public.service_case_feedback f
    JOIN public.service_cases s ON s.id=f.case_id
    JOIN public.customers c ON c.id=f.customer_id
    ORDER BY f.created_at DESC LIMIT 50
  ) x;

  RETURN jsonb_build_object('checked_at',now(),'metrics',v_metrics,'feedback',v_feedback,'viewer',v_user);
END; $$;
REVOKE ALL ON FUNCTION public.get_service_case_quality_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_case_quality_360() TO authenticated;
