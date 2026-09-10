-- Topline sales -> delivery lifecycle.
-- Phase 15: CRM integrity, Phase 16: quotation/order/project conversion,
-- Phase 17: site-survey scheduling and lifecycle state.

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;


ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('new','contacted','quoted','won','lost','draft','sent','negotiating','accepted','rejected','converted'));

CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON public.projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_quotation_id ON public.projects(quotation_id);
CREATE INDEX IF NOT EXISTS idx_projects_order_id ON public.projects(order_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_date_status ON public.site_visits(scheduled_date, status);

CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(p_lead_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_customer public.customers%ROWTYPE;
BEGIN
  IF NOT private.current_user_has_permission('projects','update') THEN
    RAISE EXCEPTION 'Insufficient permission to convert leads';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RETURN json_build_object('success',false,'error','Lead not found'); END IF;
  IF v_lead.converted_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = v_lead.converted_customer_id;
    RETURN json_build_object('success',true,'customer_id',v_customer.id,'already_converted',true);
  END IF;

  SELECT * INTO v_customer FROM public.customers
   WHERE lower(email)=lower(v_lead.email) AND v_lead.email IS NOT NULL
   ORDER BY created_at ASC LIMIT 1 FOR UPDATE;

  IF v_customer.id IS NULL THEN
    INSERT INTO public.customers(name,email,phone,company,notes)
    VALUES(v_lead.name,coalesce(v_lead.email,''),coalesce(v_lead.phone,''),v_lead.company,v_lead.notes)
    RETURNING * INTO v_customer;
  ELSE
    UPDATE public.customers SET
      name=coalesce(nullif(v_customer.name,''),v_lead.name),
      phone=coalesce(nullif(v_customer.phone,''),v_lead.phone,''),
      company=coalesce(v_customer.company,v_lead.company),
      updated_at=now()
    WHERE id=v_customer.id
    RETURNING * INTO v_customer;
  END IF;

  UPDATE public.leads SET
    status='won', converted_customer_id=v_customer.id, updated_at=now()
  WHERE id=v_lead.id;

  RETURN json_build_object('success',true,'customer_id',v_customer.id,'already_converted',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(
  p_quotation_id uuid,
  p_project_title text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_item record;
  v_project_title text;
BEGIN
  IF NOT (private.current_user_has_permission('quotations','update') OR private.current_user_has_permission('projects','insert')) THEN
    RAISE EXCEPTION 'Insufficient permission to convert quotations';
  END IF;

  SELECT * INTO v_q FROM public.quotations WHERE id=p_quotation_id FOR UPDATE;
  IF v_q.id IS NULL THEN RETURN json_build_object('success',false,'error','Quotation not found'); END IF;
  IF v_q.converted_order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_q.converted_order_id;
    SELECT * INTO v_project FROM public.projects WHERE quotation_id=v_q.id ORDER BY created_at DESC LIMIT 1;
    RETURN json_build_object('success',true,'order_id',v_order.id,'project_id',v_project.id,'already_converted',true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id=v_q.id) THEN
    RETURN json_build_object('success',false,'error','Quotation has no line items');
  END IF;

  SELECT * INTO v_customer FROM public.customers
   WHERE lower(email)=lower(v_q.email) ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
  IF v_customer.id IS NULL THEN
    INSERT INTO public.customers(name,email,phone,company)
    VALUES(v_q.name,v_q.email,v_q.phone,v_q.company) RETURNING * INTO v_customer;
  END IF;

  INSERT INTO public.orders(
    customer_id,customer_name,customer_email,customer_phone,subtotal,total_amount,status,notes
  ) VALUES(
    v_customer.id,v_q.name,v_q.email,v_q.phone,v_q.subtotal,v_q.total_amount,'confirmed',
    'Converted from quotation '||coalesce(v_q.quotation_number,v_q.id::text)
  ) RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM public.quotation_items WHERE quotation_id=v_q.id ORDER BY display_order,id LOOP
    INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit,unit_price)
    VALUES(v_order.id,v_item.product_id,v_item.description,v_item.quantity,v_item.unit,v_item.unit_price);
  END LOOP;

  v_project_title := coalesce(nullif(trim(p_project_title),''), nullif(trim(v_q.project_type),''), 'Topline Project - '||v_q.name);
  INSERT INTO public.projects(
    title,slug,client_name,customer_id,quotation_id,order_id,project_type,service_type,location,project_date,status,project_value,description
  ) VALUES(
    v_project_title,
    lower(regexp_replace(regexp_replace(v_project_title,'[^a-zA-Z0-9]+','-','g'),'^-|-$','','g'))||'-'||substr(v_order.id::text,1,8),
    v_q.name,v_customer.id,v_q.id,v_order.id,v_q.project_type,v_q.service,v_q.location,current_date,'pending',v_q.total_amount,v_q.message
  ) RETURNING * INTO v_project;

  UPDATE public.quotations SET
    status='converted', converted_order_id=v_order.id, customer_id=v_customer.id, responded_at=coalesce(responded_at,now()), updated_at=now()
  WHERE id=v_q.id;

  IF v_q.lead_id IS NOT NULL THEN
    UPDATE public.leads SET status='won', converted_customer_id=v_customer.id, converted_quotation_id=v_q.id, updated_at=now()
    WHERE id=v_q.lead_id;
  END IF;

  RETURN json_build_object('success',true,'order_id',v_order.id,'project_id',v_project.id,'customer_id',v_customer.id,'already_converted',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_site_visit(
  p_quotation_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_scheduled_date date DEFAULT NULL,
  p_scheduled_time time DEFAULT NULL,
  p_visit_type text DEFAULT 'site_survey',
  p_assigned_to uuid DEFAULT NULL,
  p_visit_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT (private.current_user_has_permission('projects','insert') OR private.current_user_has_permission('quotations','update')) THEN RAISE EXCEPTION 'Insufficient permission to schedule site visits'; END IF;
  IF p_scheduled_date IS NULL THEN RETURN json_build_object('success',false,'error','Scheduled date is required'); END IF;
  INSERT INTO public.site_visits(quotation_id,customer_id,scheduled_date,scheduled_time,visit_type,assigned_to,visit_notes)
  VALUES(p_quotation_id,p_customer_id,p_scheduled_date,p_scheduled_time,coalesce(nullif(trim(p_visit_type),''),'site_survey'),p_assigned_to,p_visit_notes)
  RETURNING id INTO v_id;
  RETURN json_build_object('success',true,'site_visit_id',v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_site_visit_status(
  p_visit_id uuid,
  p_status text,
  p_visit_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('projects','update') THEN RAISE EXCEPTION 'Insufficient permission to update site visits'; END IF;
  IF p_status NOT IN ('scheduled','completed','cancelled','rescheduled') THEN RETURN json_build_object('success',false,'error','Invalid site visit status'); END IF;
  UPDATE public.site_visits SET status=p_status, visit_notes=coalesce(p_visit_notes,visit_notes), updated_at=now() WHERE id=p_visit_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN json_build_object('success',false,'error','Site visit not found'); END IF;
  RETURN json_build_object('success',true,'site_visit_id',v_id,'status',p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_customer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.convert_quotation_to_order(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_site_visit(uuid,uuid,date,time,text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_site_visit_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_order(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_site_visit(uuid,uuid,date,time,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_site_visit_status(uuid,text,text) TO authenticated;
