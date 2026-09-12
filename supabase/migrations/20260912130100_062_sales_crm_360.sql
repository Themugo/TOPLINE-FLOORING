-- Phase 9: Sales & CRM Operations 360
-- Canonical sales lifecycle: lead -> qualification -> quotation -> customer/order.

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('note','call','email','meeting','status_change','quotation','follow_up','conversion')),
  subject text,
  content text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  due_at timestamptz NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL OR quotation_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_due_status ON public.sales_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_lead ON public.sales_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_customer ON public.sales_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_open ON public.leads(follow_up_date, status) WHERE status NOT IN ('won','lost');
CREATE INDEX IF NOT EXISTS idx_quotations_valid_until_open ON public.quotations(valid_until, status) WHERE status IN ('draft','sent','negotiating');

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_lead_activities_select ON public.lead_activities;
DROP POLICY IF EXISTS sales_lead_activities_insert ON public.lead_activities;
DROP POLICY IF EXISTS sales_tasks_select ON public.sales_tasks;
DROP POLICY IF EXISTS sales_tasks_insert ON public.sales_tasks;
DROP POLICY IF EXISTS sales_tasks_update ON public.sales_tasks;
CREATE POLICY sales_lead_activities_select ON public.lead_activities FOR SELECT TO authenticated
  USING (private.current_user_has_permission('leads','select'));
CREATE POLICY sales_lead_activities_insert ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (private.current_user_has_permission('leads','update'));
CREATE POLICY sales_tasks_select ON public.sales_tasks FOR SELECT TO authenticated
  USING (private.current_user_has_permission('leads','select'));
CREATE POLICY sales_tasks_insert ON public.sales_tasks FOR INSERT TO authenticated
  WITH CHECK (private.current_user_has_permission('leads','insert'));
CREATE POLICY sales_tasks_update ON public.sales_tasks FOR UPDATE TO authenticated
  USING (private.current_user_has_permission('leads','update'))
  WITH CHECK (private.current_user_has_permission('leads','update'));

CREATE OR REPLACE FUNCTION public.add_lead_activity(
  p_lead_id uuid, p_activity_type text, p_subject text DEFAULT NULL, p_content text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('leads','update') THEN RAISE EXCEPTION 'Insufficient permission to add lead activity'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id) THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF p_activity_type NOT IN ('note','call','email','meeting','status_change','quotation','follow_up','conversion') THEN RAISE EXCEPTION 'Invalid activity type'; END IF;
  INSERT INTO public.lead_activities(lead_id,activity_type,subject,content,performed_by)
  VALUES(p_lead_id,p_activity_type,nullif(trim(p_subject),''),nullif(trim(p_content),''),auth.uid()) RETURNING id INTO v_id;
  RETURN json_build_object('success',true,'activity_id',v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.transition_lead_status(p_lead_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old text; v_id uuid; v_reason text;
BEGIN
  IF NOT private.current_user_has_permission('leads','update') THEN RAISE EXCEPTION 'Insufficient permission to update leads'; END IF;
  IF p_status NOT IN ('new','contacted','qualified','proposal','negotiating','won','lost','on_hold') THEN RAISE EXCEPTION 'Invalid lead status'; END IF;
  SELECT status INTO v_old FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF v_old = p_status THEN RETURN json_build_object('success',true,'status',v_old,'unchanged',true); END IF;
  IF p_status='lost' AND nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Lost reason is required'; END IF;
  v_reason := nullif(trim(p_reason),'');
  UPDATE public.leads SET status=p_status, lost_reason=CASE WHEN p_status='lost' THEN v_reason ELSE lost_reason END,
    outcome=CASE WHEN p_status='won' THEN 'won' WHEN p_status='lost' THEN 'lost' ELSE outcome END, updated_at=now() WHERE id=p_lead_id RETURNING id INTO v_id;
  INSERT INTO public.lead_activities(lead_id,activity_type,subject,content,performed_by)
  VALUES(v_id,'status_change','Lead status changed',format('%s -> %s%s',v_old,p_status,CASE WHEN v_reason IS NOT NULL THEN ': '||v_reason ELSE '' END),auth.uid());
  RETURN json_build_object('success',true,'status',p_status,'previous_status',v_old);
END; $$;

CREATE OR REPLACE FUNCTION public.create_sales_task(
  p_title text, p_due_at timestamptz, p_lead_id uuid DEFAULT NULL, p_customer_id uuid DEFAULT NULL,
  p_quotation_id uuid DEFAULT NULL, p_assigned_to uuid DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('leads','insert') THEN RAISE EXCEPTION 'Insufficient permission to create sales tasks'; END IF;
  IF nullif(trim(p_title),'') IS NULL OR p_due_at IS NULL THEN RAISE EXCEPTION 'Task title and due time are required'; END IF;
  IF p_lead_id IS NULL AND p_customer_id IS NULL AND p_quotation_id IS NULL THEN RAISE EXCEPTION 'Task must be linked to a lead, customer or quotation'; END IF;
  INSERT INTO public.sales_tasks(title,due_at,lead_id,customer_id,quotation_id,assigned_to,notes,created_by)
  VALUES(trim(p_title),p_due_at,p_lead_id,p_customer_id,p_quotation_id,p_assigned_to,p_notes,auth.uid()) RETURNING id INTO v_id;
  RETURN json_build_object('success',true,'task_id',v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_sales_task(p_task_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('leads','update') THEN RAISE EXCEPTION 'Insufficient permission to complete sales tasks'; END IF;
  UPDATE public.sales_tasks SET status='completed',completed_at=now(),updated_at=now() WHERE id=p_task_id AND status='open' RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Open sales task not found'; END IF;
  RETURN json_build_object('success',true,'task_id',v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.transition_quotation_status(p_quotation_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old text; v_id uuid; v_now timestamptz:=now();
BEGIN
  IF NOT private.current_user_has_permission('quotations','update') THEN RAISE EXCEPTION 'Insufficient permission to update quotations'; END IF;
  IF p_status NOT IN ('draft','sent','negotiating','accepted','rejected','converted') THEN RAISE EXCEPTION 'Invalid quotation status'; END IF;
  SELECT status INTO v_old FROM public.quotations WHERE id=p_quotation_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Quotation not found'; END IF;
  IF p_status='sent' AND NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id=p_quotation_id) THEN RAISE EXCEPTION 'Quotation must contain line items before sending'; END IF;
  UPDATE public.quotations SET status=p_status,
    sent_at=CASE WHEN p_status='sent' THEN coalesce(sent_at,v_now) ELSE sent_at END,
    responded_at=CASE WHEN p_status IN ('accepted','rejected') THEN coalesce(responded_at,v_now) ELSE responded_at END,
    updated_at=v_now WHERE id=p_quotation_id RETURNING id INTO v_id;
  RETURN json_build_object('success',true,'quotation_id',v_id,'status',p_status,'previous_status',v_old,'reason',p_reason);
END; $$;

CREATE OR REPLACE FUNCTION public.get_sales_crm_360()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result json;
BEGIN
  IF NOT private.current_user_has_permission('leads','select') THEN RAISE EXCEPTION 'Insufficient permission to view sales CRM'; END IF;
  SELECT json_build_object(
    'leads', (SELECT count(*) FROM public.leads WHERE status NOT IN ('won','lost')),
    'qualified_leads', (SELECT count(*) FROM public.leads WHERE status='qualified'),
    'pipeline_value', coalesce((SELECT sum(coalesce(estimated_value,0)) FROM public.leads WHERE status NOT IN ('won','lost')),0),
    'overdue_follow_ups', (SELECT count(*) FROM public.leads WHERE follow_up_date < current_date AND status NOT IN ('won','lost')),
    'open_quotes', (SELECT count(*) FROM public.quotations WHERE status IN ('draft','sent','negotiating')),
    'quote_value', coalesce((SELECT sum(total_amount) FROM public.quotations WHERE status IN ('draft','sent','negotiating')),0),
    'accepted_quotes', (SELECT count(*) FROM public.quotations WHERE status='accepted'),
    'open_tasks', (SELECT count(*) FROM public.sales_tasks WHERE status='open'),
    'overdue_tasks', (SELECT count(*) FROM public.sales_tasks WHERE status='open' AND due_at < now()),
    'won_leads', (SELECT count(*) FROM public.leads WHERE status='won'),
    'lost_leads', (SELECT count(*) FROM public.leads WHERE status='lost')
  ) INTO result;
  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.add_lead_activity(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_lead_status(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_sales_task(text,timestamptz,uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_sales_task(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_quotation_status(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sales_crm_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_lead_activity(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_task(text,timestamptz,uuid,uuid,uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sales_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_quotation_status(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_crm_360() TO authenticated;
