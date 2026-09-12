-- Operation 1: Commercial Lifecycle 360
-- Lead -> customer -> site assessment -> quotation -> order -> project.
-- This migration converges staff mutations behind atomic RPCs and provides one
-- server-authoritative commercial operations snapshot.

CREATE TABLE IF NOT EXISTS public.commercial_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  site_visit_id uuid REFERENCES public.site_visits(id) ON DELETE SET NULL,
  previous_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}',
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_events_created_at ON public.commercial_lifecycle_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_events_lead ON public.commercial_lifecycle_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_commercial_events_quotation ON public.commercial_lifecycle_events(quotation_id);

ALTER TABLE public.commercial_lifecycle_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commercial_events_staff_select ON public.commercial_lifecycle_events;
CREATE POLICY commercial_events_staff_select ON public.commercial_lifecycle_events
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('leads','select'));

CREATE OR REPLACE FUNCTION public.create_lead_transaction(
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_company text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_status text DEFAULT 'new',
  p_estimated_value numeric DEFAULT NULL,
  p_project_location text DEFAULT NULL,
  p_project_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_follow_up_date date DEFAULT NULL,
  p_follow_up_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_lead public.leads%ROWTYPE;
BEGIN
  IF NOT private.current_user_has_permission('leads','insert') THEN
    RAISE EXCEPTION 'Insufficient permission to create leads';
  END IF;
  IF nullif(trim(p_name),'') IS NULL THEN
    RETURN json_build_object('success',false,'error','Lead name is required');
  END IF;
  IF p_status NOT IN ('new','contacted','qualified','proposal','negotiating','won','lost','on_hold') THEN
    RETURN json_build_object('success',false,'error','Invalid lead status');
  END IF;
  IF p_follow_up_date IS NOT NULL AND p_follow_up_date < current_date THEN
    RETURN json_build_object('success',false,'error','Follow-up date cannot be in the past');
  END IF;
  INSERT INTO public.leads(name,email,phone,company,source,status,estimated_value,project_location,project_address,notes,assigned_to,follow_up_date,follow_up_notes,created_by)
  VALUES(trim(p_name),nullif(lower(trim(coalesce(p_email,''))),''),nullif(trim(coalesce(p_phone,'')),''),nullif(trim(coalesce(p_company,'')),''),coalesce(nullif(trim(p_source),''),'manual'),p_status,p_estimated_value,nullif(trim(coalesce(p_project_location,'')),''),nullif(trim(coalesce(p_project_address,'')),''),p_notes,p_assigned_to,p_follow_up_date,p_follow_up_notes,auth.uid())
  RETURNING * INTO v_lead;
  INSERT INTO public.commercial_lifecycle_events(event_type,lead_id,new_status,metadata,actor_user_id)
  VALUES('lead_created',v_lead.id,v_lead.status,jsonb_build_object('source',v_lead.source),auth.uid());
  RETURN json_build_object('success',true,'lead_id',v_lead.id);
END; $$;

CREATE OR REPLACE FUNCTION public.update_lead_transaction(
  p_lead_id uuid,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_company text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_estimated_value numeric DEFAULT NULL,
  p_project_location text DEFAULT NULL,
  p_project_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_follow_up_date date DEFAULT NULL,
  p_follow_up_notes text DEFAULT NULL,
  p_lost_reason text DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_outcome_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old public.leads%ROWTYPE; v_new public.leads%ROWTYPE;
BEGIN
  IF NOT private.current_user_has_permission('leads','update') THEN RAISE EXCEPTION 'Insufficient permission to update leads'; END IF;
  SELECT * INTO v_old FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF v_old.id IS NULL THEN RETURN json_build_object('success',false,'error','Lead not found'); END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('new','contacted','qualified','proposal','negotiating','won','lost','on_hold') THEN
    RETURN json_build_object('success',false,'error','Invalid lead status');
  END IF;
  IF p_follow_up_date IS NOT NULL AND p_follow_up_date < current_date THEN
    RETURN json_build_object('success',false,'error','Follow-up date cannot be in the past');
  END IF;
  IF v_old.converted_customer_id IS NOT NULL AND p_status IS NOT NULL AND p_status <> 'won' THEN
    RETURN json_build_object('success',false,'error','Converted leads cannot leave the won state');
  END IF;
  UPDATE public.leads SET
    name=coalesce(nullif(trim(p_name),''),name),
    email=CASE WHEN p_email IS NULL THEN email ELSE nullif(lower(trim(p_email)),'') END,
    phone=CASE WHEN p_phone IS NULL THEN phone ELSE nullif(trim(p_phone),'') END,
    company=CASE WHEN p_company IS NULL THEN company ELSE nullif(trim(p_company),'') END,
    source=coalesce(nullif(trim(p_source),''),source),
    status=coalesce(p_status,status),
    estimated_value=coalesce(p_estimated_value,estimated_value),
    project_location=CASE WHEN p_project_location IS NULL THEN project_location ELSE nullif(trim(p_project_location),'') END,
    project_address=CASE WHEN p_project_address IS NULL THEN project_address ELSE nullif(trim(p_project_address),'') END,
    notes=CASE WHEN p_notes IS NULL THEN notes ELSE p_notes END,
    assigned_to=CASE WHEN p_assigned_to IS NULL THEN assigned_to ELSE p_assigned_to END,
    follow_up_date=CASE WHEN p_follow_up_date IS NULL THEN follow_up_date ELSE p_follow_up_date END,
    follow_up_notes=CASE WHEN p_follow_up_notes IS NULL THEN follow_up_notes ELSE p_follow_up_notes END,
    lost_reason=CASE WHEN p_lost_reason IS NULL THEN lost_reason ELSE p_lost_reason END,
    outcome=CASE WHEN p_outcome IS NULL THEN outcome ELSE p_outcome END,
    outcome_reason=CASE WHEN p_outcome_reason IS NULL THEN outcome_reason ELSE p_outcome_reason END,
    updated_at=now()
  WHERE id=p_lead_id RETURNING * INTO v_new;
  INSERT INTO public.commercial_lifecycle_events(event_type,lead_id,previous_status,new_status,metadata,actor_user_id)
  VALUES('lead_updated',v_new.id,v_old.status,v_new.status,jsonb_build_object('changed_status',v_old.status IS DISTINCT FROM v_new.status),auth.uid());
  RETURN json_build_object('success',true,'lead_id',v_new.id,'status',v_new.status);
END; $$;

CREATE OR REPLACE FUNCTION public.delete_lead_transaction(p_lead_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_lead public.leads%ROWTYPE;
BEGIN
  IF NOT private.current_user_has_permission('leads','delete') THEN RAISE EXCEPTION 'Insufficient permission to delete leads'; END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RETURN json_build_object('success',false,'error','Lead not found'); END IF;
  IF v_lead.converted_customer_id IS NOT NULL OR v_lead.converted_quotation_id IS NOT NULL THEN
    RETURN json_build_object('success',false,'error','Converted leads cannot be deleted; retain the commercial history');
  END IF;
  DELETE FROM public.leads WHERE id=p_lead_id;
  INSERT INTO public.commercial_lifecycle_events(event_type,metadata,actor_user_id)
  VALUES('lead_deleted',jsonb_build_object('lead_id',p_lead_id,'lead_number',v_lead.lead_number),auth.uid());
  RETURN json_build_object('success',true,'lead_id',p_lead_id);
END; $$;

CREATE OR REPLACE FUNCTION public.create_lead_from_quotation(p_quotation_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_q public.quotations%ROWTYPE; v_lead public.leads%ROWTYPE;
BEGIN
  IF NOT (private.current_user_has_permission('leads','insert') AND private.current_user_has_permission('quotations','update')) THEN
    RAISE EXCEPTION 'Insufficient permission to link quotation to a lead';
  END IF;
  SELECT * INTO v_q FROM public.quotations WHERE id=p_quotation_id FOR UPDATE;
  IF v_q.id IS NULL THEN RETURN json_build_object('success',false,'error','Quotation not found'); END IF;
  IF v_q.lead_id IS NOT NULL THEN RETURN json_build_object('success',true,'lead_id',v_q.lead_id,'already_linked',true); END IF;
  IF v_q.email IS NOT NULL THEN
    SELECT * INTO v_lead FROM public.leads WHERE lower(trim(email))=lower(trim(v_q.email)) ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
  END IF;
  IF v_lead.id IS NULL THEN
    INSERT INTO public.leads(name,email,phone,company,source,status,estimated_value,project_location,notes,created_by)
    VALUES(trim(v_q.name),lower(trim(v_q.email)),nullif(trim(v_q.phone),''),nullif(trim(v_q.company),''),'website','new',v_q.total_amount,nullif(trim(v_q.location),''),coalesce(v_q.message,'From quotation request'),auth.uid())
    RETURNING * INTO v_lead;
    INSERT INTO public.commercial_lifecycle_events(event_type,lead_id,quotation_id,new_status,metadata,actor_user_id)
    VALUES('quotation_lead_created',v_lead.id,v_q.id,v_lead.status,'{}',auth.uid());
  END IF;
  UPDATE public.quotations SET lead_id=v_lead.id, updated_at=now() WHERE id=v_q.id;
  RETURN json_build_object('success',true,'lead_id',v_lead.id,'quotation_id',v_q.id,'already_linked',false);
END; $$;

CREATE OR REPLACE FUNCTION public.upsert_quotation_item_transaction(
  p_quotation_id uuid,
  p_item_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_quantity numeric DEFAULT 1,
  p_unit text DEFAULT 'sqm',
  p_unit_price numeric DEFAULT 0,
  p_product_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_subtotal numeric; v_tax numeric; v_total numeric; v_tax_rate numeric;
BEGIN
  IF NOT private.current_user_has_permission('quotations','update') THEN RAISE EXCEPTION 'Insufficient permission to edit quotation items'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotations WHERE id=p_quotation_id FOR UPDATE) THEN RETURN json_build_object('success',false,'error','Quotation not found'); END IF;
  IF nullif(trim(p_description),'') IS NULL THEN RETURN json_build_object('success',false,'error','Item description is required'); END IF;
  IF p_quantity <= 0 OR p_unit_price < 0 THEN RETURN json_build_object('success',false,'error','Quantity must be positive and price cannot be negative'); END IF;
  IF p_item_id IS NULL THEN
    INSERT INTO public.quotation_items(quotation_id,product_id,description,quantity,unit,unit_price)
    VALUES(p_quotation_id,p_product_id,trim(p_description),p_quantity,coalesce(nullif(trim(p_unit),''),'sqm'),p_unit_price)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.quotation_items SET product_id=coalesce(p_product_id,product_id),description=trim(p_description),quantity=p_quantity,unit=coalesce(nullif(trim(p_unit),''),unit),unit_price=p_unit_price
    WHERE id=p_item_id AND quotation_id=p_quotation_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RETURN json_build_object('success',false,'error','Quotation item not found'); END IF;
  END IF;
  SELECT coalesce(sum(line_total),0) INTO v_subtotal FROM public.quotation_items WHERE quotation_id=p_quotation_id;
  SELECT tax_rate INTO v_tax_rate FROM public.quotations WHERE id=p_quotation_id;
  v_tax := round(v_subtotal * coalesce(v_tax_rate,16) / 100,2); v_total := v_subtotal + v_tax;
  UPDATE public.quotations SET subtotal=v_subtotal,tax_amount=v_tax,total_amount=v_total,updated_at=now() WHERE id=p_quotation_id;
  INSERT INTO public.commercial_lifecycle_events(event_type,quotation_id,metadata,actor_user_id)
  VALUES('quotation_item_upserted',p_quotation_id,jsonb_build_object('item_id',v_id,'subtotal',v_subtotal,'total',v_total),auth.uid());
  RETURN json_build_object('success',true,'item_id',v_id,'subtotal',v_subtotal,'tax_amount',v_tax,'total_amount',v_total);
END; $$;

CREATE OR REPLACE FUNCTION public.remove_quotation_item_transaction(p_item_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_qid uuid; v_subtotal numeric; v_tax numeric; v_total numeric; v_tax_rate numeric;
BEGIN
  IF NOT private.current_user_has_permission('quotations','update') THEN RAISE EXCEPTION 'Insufficient permission to edit quotation items'; END IF;
  SELECT quotation_id INTO v_qid FROM public.quotation_items WHERE id=p_item_id FOR UPDATE;
  IF v_qid IS NULL THEN RETURN json_build_object('success',false,'error','Quotation item not found'); END IF;
  DELETE FROM public.quotation_items WHERE id=p_item_id;
  SELECT coalesce(sum(line_total),0) INTO v_subtotal FROM public.quotation_items WHERE quotation_id=v_qid;
  SELECT tax_rate INTO v_tax_rate FROM public.quotations WHERE id=v_qid FOR UPDATE;
  v_tax := round(v_subtotal * coalesce(v_tax_rate,16) / 100,2); v_total := v_subtotal + v_tax;
  UPDATE public.quotations SET subtotal=v_subtotal,tax_amount=v_tax,total_amount=v_total,updated_at=now() WHERE id=v_qid;
  INSERT INTO public.commercial_lifecycle_events(event_type,quotation_id,metadata,actor_user_id)
  VALUES('quotation_item_removed',v_qid,jsonb_build_object('item_id',p_item_id,'subtotal',v_subtotal,'total',v_total),auth.uid());
  RETURN json_build_object('success',true,'quotation_id',v_qid,'subtotal',v_subtotal,'tax_amount',v_tax,'total_amount',v_total);
END; $$;

CREATE OR REPLACE FUNCTION public.get_commercial_lifecycle_360()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result json;
BEGIN
  IF NOT private.current_user_has_permission('leads','select') THEN RAISE EXCEPTION 'Insufficient permission to view commercial lifecycle'; END IF;
  SELECT json_build_object(
    'leads_open', (SELECT count(*) FROM public.leads WHERE status NOT IN ('won','lost')),
    'leads_qualified', (SELECT count(*) FROM public.leads WHERE status='qualified'),
    'leads_overdue_follow_up', (SELECT count(*) FROM public.leads WHERE follow_up_date < current_date AND status NOT IN ('won','lost')),
    'pipeline_value', coalesce((SELECT sum(coalesce(estimated_value,0)) FROM public.leads WHERE status NOT IN ('won','lost')),0),
    'quotations_open', (SELECT count(*) FROM public.quotations WHERE status IN ('new','contacted','quoted','draft','sent','negotiating')),
    'quotations_accepted', (SELECT count(*) FROM public.quotations WHERE status='accepted'),
    'quotation_pipeline_value', coalesce((SELECT sum(coalesce(total_amount,0)) FROM public.quotations WHERE status IN ('new','contacted','quoted','draft','sent','negotiating','accepted')),0),
    'site_visits_upcoming', (SELECT count(*) FROM public.site_visits WHERE status IN ('scheduled','rescheduled') AND scheduled_date >= current_date),
    'customers_created_30d', (SELECT count(*) FROM public.customers WHERE created_at >= now()-interval '30 days'),
    'orders_created_30d', (SELECT count(*) FROM public.orders WHERE created_at >= now()-interval '30 days' AND status <> 'cancelled'),
    'order_value_30d', coalesce((SELECT sum(coalesce(total_amount,0)) FROM public.orders WHERE created_at >= now()-interval '30 days' AND status <> 'cancelled'),0),
    'projects_created_30d', (SELECT count(*) FROM public.projects WHERE created_at >= now()-interval '30 days' AND status <> 'cancelled'),
    'won_leads', (SELECT count(*) FROM public.leads WHERE status='won'),
    'lost_leads', (SELECT count(*) FROM public.leads WHERE status='lost'),
    'recent_events', coalesce((SELECT json_agg(e ORDER BY e.created_at DESC) FROM (SELECT event_type,lead_id,quotation_id,customer_id,order_id,project_id,new_status,created_at FROM public.commercial_lifecycle_events ORDER BY created_at DESC LIMIT 12) e),'[]'::json)
  ) INTO result;
  RETURN result;
END; $$;

-- Staff browser mutations are now performed through the operation RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.leads FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.quotation_items FROM authenticated;
REVOKE UPDATE ON public.quotations FROM authenticated;

REVOKE ALL ON FUNCTION public.create_lead_transaction(text,text,text,text,text,text,numeric,text,text,text,uuid,date,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_lead_transaction(uuid,text,text,text,text,text,text,numeric,text,text,text,uuid,date,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_lead_transaction(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_lead_from_quotation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_quotation_item_transaction(uuid,uuid,text,numeric,text,numeric,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_quotation_item_transaction(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_commercial_lifecycle_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lead_transaction(text,text,text,text,text,text,numeric,text,text,text,uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lead_transaction(uuid,text,text,text,text,text,text,numeric,text,text,text,uuid,date,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_lead_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_lead_from_quotation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_quotation_item_transaction(uuid,uuid,text,numeric,text,numeric,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_quotation_item_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commercial_lifecycle_360() TO authenticated;
