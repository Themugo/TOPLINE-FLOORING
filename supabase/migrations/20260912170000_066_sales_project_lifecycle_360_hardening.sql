-- Phase 15–17 hardening: transactional sales -> project -> field lifecycle.
-- This migration strengthens the existing lifecycle without creating a second
-- competing data model. Existing canonical tables remain authoritative.

CREATE TABLE IF NOT EXISTS public.sales_project_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'lead_converted','quotation_converted','site_visit_scheduled','site_visit_status_changed'
  )),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  site_visit_id uuid REFERENCES public.site_visits(id) ON DELETE SET NULL,
  previous_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_project_lifecycle_events_created
  ON public.sales_project_lifecycle_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_project_lifecycle_events_quotation
  ON public.sales_project_lifecycle_events(quotation_id);
CREATE INDEX IF NOT EXISTS idx_sales_project_lifecycle_events_project
  ON public.sales_project_lifecycle_events(project_id);

ALTER TABLE public.sales_project_lifecycle_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_project_lifecycle_events FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.sales_project_lifecycle_events TO authenticated;
DROP POLICY IF EXISTS sales_project_lifecycle_events_staff_select ON public.sales_project_lifecycle_events;
CREATE POLICY sales_project_lifecycle_events_staff_select
  ON public.sales_project_lifecycle_events FOR SELECT TO authenticated
  USING (private.current_user_has_permission('projects','select'));

-- Serialize customer matching by normalized email so concurrent conversions
-- cannot create duplicate customer records through this lifecycle.
CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(p_lead_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_email text;
BEGIN
  IF NOT private.current_user_has_permission('leads','update') THEN
    RAISE EXCEPTION 'Insufficient permission to convert leads';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN
    RETURN json_build_object('success',false,'error','Lead not found');
  END IF;

  IF v_lead.converted_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = v_lead.converted_customer_id;
    RETURN json_build_object('success',true,'customer_id',v_customer.id,'already_converted',true);
  END IF;

  v_email := lower(trim(coalesce(v_lead.email,'')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'A lead email is required for customer conversion';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 66017));

  SELECT * INTO v_customer
    FROM public.customers
   WHERE lower(trim(email)) = v_email
   ORDER BY created_at ASC
   LIMIT 1
   FOR UPDATE;

  IF v_customer.id IS NULL THEN
    INSERT INTO public.customers(name,email,phone,company,notes)
    VALUES(trim(v_lead.name),v_email,trim(coalesce(v_lead.phone,'')),v_lead.company,v_lead.notes)
    RETURNING * INTO v_customer;
  ELSE
    UPDATE public.customers SET
      name = coalesce(nullif(trim(v_customer.name),''),trim(v_lead.name)),
      phone = coalesce(nullif(trim(v_customer.phone),''),trim(v_lead.phone),''),
      company = coalesce(v_customer.company,v_lead.company),
      notes = coalesce(v_customer.notes,v_lead.notes),
      updated_at = now()
    WHERE id = v_customer.id
    RETURNING * INTO v_customer;
  END IF;

  UPDATE public.leads SET
    status='won', converted_customer_id=v_customer.id, outcome='won', updated_at=now()
  WHERE id=v_lead.id;

  INSERT INTO public.sales_project_lifecycle_events(
    event_type,lead_id,customer_id,new_status,metadata,actor_user_id
  ) VALUES (
    'lead_converted',v_lead.id,v_customer.id,'won',
    jsonb_build_object('already_converted',false),auth.uid()
  );

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
  v_email text;
BEGIN
  IF NOT (private.current_user_has_permission('quotations','update') AND private.current_user_has_permission('orders','insert') AND private.current_user_has_permission('projects','insert')) THEN
    RAISE EXCEPTION 'Insufficient permission to convert quotations';
  END IF;

  SELECT * INTO v_q FROM public.quotations WHERE id=p_quotation_id FOR UPDATE;
  IF v_q.id IS NULL THEN
    RETURN json_build_object('success',false,'error','Quotation not found');
  END IF;

  IF v_q.converted_order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_q.converted_order_id;
    SELECT * INTO v_project FROM public.projects WHERE quotation_id=v_q.id ORDER BY created_at DESC LIMIT 1;
    RETURN json_build_object('success',true,'order_id',v_order.id,'project_id',v_project.id,'customer_id',v_q.customer_id,'already_converted',true);
  END IF;

  IF v_q.status NOT IN ('accepted','won') THEN
    RETURN json_build_object('success',false,'error','Only an accepted quotation can be converted to an order');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id=v_q.id) THEN
    RETURN json_build_object('success',false,'error','Quotation has no line items');
  END IF;

  v_email := lower(trim(v_q.email));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 66017));

  IF v_q.customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id=v_q.customer_id FOR UPDATE;
  END IF;

  IF v_customer.id IS NULL THEN
    SELECT * INTO v_customer
      FROM public.customers
     WHERE lower(trim(email))=v_email
     ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
  END IF;

  IF v_customer.id IS NULL THEN
    INSERT INTO public.customers(name,email,phone,company)
    VALUES(trim(v_q.name),v_email,trim(v_q.phone),v_q.company)
    RETURNING * INTO v_customer;
  END IF;

  INSERT INTO public.orders(
    customer_id,customer_name,customer_email,customer_phone,subtotal,total_amount,status,notes
  ) VALUES(
    v_customer.id,v_q.name,v_q.email,v_q.phone,v_q.subtotal,v_q.total_amount,'confirmed',
    'Converted from quotation '||coalesce(v_q.quotation_number,v_q.id::text)
  ) RETURNING * INTO v_order;

  FOR v_item IN
    SELECT * FROM public.quotation_items WHERE quotation_id=v_q.id ORDER BY display_order,id
  LOOP
    INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit,unit_price)
    VALUES(v_order.id,v_item.product_id,v_item.description,v_item.quantity,v_item.unit,v_item.unit_price);
  END LOOP;

  v_project_title := coalesce(
    nullif(trim(p_project_title),''),
    nullif(trim(v_q.project_type),''),
    'Topline Project - '||v_q.name
  );

  INSERT INTO public.projects(
    title,slug,client_name,customer_id,quotation_id,order_id,project_type,service_type,
    location,project_date,status,project_value,description
  ) VALUES(
    v_project_title,
    lower(regexp_replace(regexp_replace(v_project_title,'[^a-zA-Z0-9]+','-','g'),'^-|-$','','g'))||'-'||substr(v_order.id::text,1,8),
    v_q.name,v_customer.id,v_q.id,v_order.id,v_q.project_type,v_q.service,v_q.location,
    current_date,'pending',v_q.total_amount,v_q.message
  ) RETURNING * INTO v_project;

  UPDATE public.quotations SET
    status='converted', converted_order_id=v_order.id, customer_id=v_customer.id,
    responded_at=coalesce(responded_at,now()), updated_at=now()
  WHERE id=v_q.id;

  IF v_q.lead_id IS NOT NULL THEN
    UPDATE public.leads SET
      status='won', converted_customer_id=v_customer.id, converted_quotation_id=v_q.id, outcome='won', updated_at=now()
    WHERE id=v_q.lead_id;
  END IF;

  INSERT INTO public.sales_project_lifecycle_events(
    event_type,lead_id,quotation_id,customer_id,order_id,project_id,previous_status,new_status,metadata,actor_user_id
  ) VALUES (
    'quotation_converted',v_q.lead_id,v_q.id,v_customer.id,v_order.id,v_project.id,v_q.status,'converted',
    jsonb_build_object('quotation_number',v_q.quotation_number,'total_amount',v_q.total_amount),auth.uid()
  );

  RETURN json_build_object(
    'success',true,'order_id',v_order.id,'project_id',v_project.id,
    'customer_id',v_customer.id,'already_converted',false
  );
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
DECLARE
  v_id uuid;
  v_customer_id uuid := p_customer_id;
  v_project_id uuid;
  v_quotation public.quotations%ROWTYPE;
BEGIN
  IF NOT (private.current_user_has_permission('projects','insert') OR private.current_user_has_permission('quotations','update')) THEN
    RAISE EXCEPTION 'Insufficient permission to schedule site visits';
  END IF;
  IF p_scheduled_date IS NULL THEN
    RETURN json_build_object('success',false,'error','Scheduled date is required');
  END IF;
  IF p_scheduled_date < current_date THEN
    RETURN json_build_object('success',false,'error','Scheduled date cannot be in the past');
  END IF;
  IF p_quotation_id IS NOT NULL THEN
    SELECT * INTO v_quotation FROM public.quotations WHERE id=p_quotation_id;
    IF v_quotation.id IS NULL THEN
      RETURN json_build_object('success',false,'error','Quotation not found');
    END IF;
    IF v_customer_id IS NULL THEN v_customer_id := v_quotation.customer_id; END IF;
    SELECT id INTO v_project_id FROM public.projects WHERE quotation_id=p_quotation_id ORDER BY created_at DESC LIMIT 1;
    IF v_customer_id IS NOT NULL AND v_quotation.customer_id IS NOT NULL AND v_customer_id <> v_quotation.customer_id THEN
      RETURN json_build_object('success',false,'error','Customer does not match the quotation');
    END IF;
  END IF;
  IF p_assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_profiles WHERE user_id=p_assigned_to AND is_active=true
  ) THEN
    RETURN json_build_object('success',false,'error','Assigned staff member is not active');
  END IF;

  INSERT INTO public.site_visits(
    project_id,quotation_id,customer_id,scheduled_date,scheduled_time,visit_type,assigned_to,visit_notes
  ) VALUES(
    v_project_id,p_quotation_id,v_customer_id,p_scheduled_date,p_scheduled_time,
    coalesce(nullif(trim(p_visit_type),''),'site_survey'),p_assigned_to,p_visit_notes
  ) RETURNING id INTO v_id;

  INSERT INTO public.sales_project_lifecycle_events(
    event_type,quotation_id,customer_id,project_id,site_visit_id,new_status,metadata,actor_user_id
  ) VALUES(
    'site_visit_scheduled',p_quotation_id,v_customer_id,v_project_id,v_id,'scheduled',
    jsonb_build_object('scheduled_date',p_scheduled_date,'scheduled_time',p_scheduled_time,'visit_type',p_visit_type),auth.uid()
  );

  RETURN json_build_object('success',true,'site_visit_id',v_id,'project_id',v_project_id,'customer_id',v_customer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_site_visit_status(
  p_visit_id uuid,
  p_status text,
  p_visit_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_old text;
  v_id uuid;
  v_project_id uuid;
  v_quotation_id uuid;
  v_customer_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('projects','update') THEN
    RAISE EXCEPTION 'Insufficient permission to update site visits';
  END IF;
  IF p_status NOT IN ('scheduled','completed','cancelled','rescheduled') THEN
    RETURN json_build_object('success',false,'error','Invalid site visit status');
  END IF;

  SELECT status,project_id,quotation_id,customer_id
    INTO v_old,v_project_id,v_quotation_id,v_customer_id
    FROM public.site_visits WHERE id=p_visit_id FOR UPDATE;
  IF v_old IS NULL THEN
    RETURN json_build_object('success',false,'error','Site visit not found');
  END IF;

  IF v_old = 'completed' AND p_status <> 'completed' THEN
    RETURN json_build_object('success',false,'error','Completed site visits cannot be reopened');
  END IF;
  IF v_old = 'cancelled' AND p_status <> 'cancelled' THEN
    RETURN json_build_object('success',false,'error','Cancelled site visits cannot be reopened');
  END IF;
  IF v_old = 'scheduled' AND p_status NOT IN ('scheduled','completed','cancelled','rescheduled') THEN
    RETURN json_build_object('success',false,'error','Invalid site visit transition');
  END IF;
  IF v_old = 'rescheduled' AND p_status NOT IN ('scheduled','cancelled','rescheduled') THEN
    RETURN json_build_object('success',false,'error','Invalid rescheduled visit transition');
  END IF;

  UPDATE public.site_visits
     SET status=p_status, visit_notes=coalesce(nullif(trim(p_visit_notes),''),visit_notes), updated_at=now()
   WHERE id=p_visit_id
   RETURNING id INTO v_id;

  INSERT INTO public.sales_project_lifecycle_events(
    event_type,quotation_id,customer_id,project_id,site_visit_id,previous_status,new_status,metadata,actor_user_id
  ) VALUES(
    'site_visit_status_changed',v_quotation_id,v_customer_id,v_project_id,v_id,v_old,p_status,
    jsonb_build_object('notes_changed',p_visit_notes IS NOT NULL),auth.uid()
  );

  RETURN json_build_object('success',true,'site_visit_id',v_id,'status',p_status,'previous_status',v_old);
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
