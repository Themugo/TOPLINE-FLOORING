-- Phase 16: fail-closed, idempotent quotation -> order -> project conversion.
-- Preserves the existing lifecycle and permission model while rejecting incomplete
-- legacy conversion links and quotations that cannot identify a customer.
CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(
  p_quotation_id uuid,
  p_project_title text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $fn$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_item record;
  v_project_title text;
  v_email text;
BEGIN
  IF NOT (
    private.current_user_has_permission('quotations','update')
    AND private.current_user_has_permission('orders','insert')
    AND private.current_user_has_permission('projects','insert')
  ) THEN
    RAISE EXCEPTION 'Insufficient permission to convert quotations';
  END IF;

  SELECT * INTO v_q
    FROM public.quotations
   WHERE id = p_quotation_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success',false,'error','Quotation not found');
  END IF;

  -- An existing conversion is valid only when both downstream records still exist
  -- and point back to this quotation/order/customer relationship.
  IF v_q.converted_order_id IS NOT NULL THEN
    SELECT * INTO v_order
      FROM public.orders
     WHERE id = v_q.converted_order_id;
    SELECT * INTO v_project
      FROM public.projects
     WHERE quotation_id = v_q.id
       AND order_id = v_q.converted_order_id
     ORDER BY created_at DESC
     LIMIT 1;
    IF v_order.id IS NULL OR v_project.id IS NULL
       OR v_project.customer_id IS DISTINCT FROM v_q.customer_id
       OR v_order.customer_id IS DISTINCT FROM v_q.customer_id THEN
      RAISE EXCEPTION 'Quotation conversion links are incomplete or inconsistent; reconcile before retrying';
    END IF;
    RETURN json_build_object(
      'success',true,'order_id',v_order.id,'project_id',v_project.id,
      'customer_id',v_q.customer_id,'already_converted',true
    );
  END IF;

  IF v_q.status NOT IN ('accepted','won') THEN
    RETURN json_build_object('success',false,'error','Only an accepted quotation can be converted to an order');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id = v_q.id) THEN
    RETURN json_build_object('success',false,'error','Quotation has no line items');
  END IF;

  v_email := lower(trim(coalesce(v_q.email,'')));
  IF v_email = '' THEN
    RETURN json_build_object('success',false,'error','A quotation email is required to identify the customer');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 66017));

  IF v_q.customer_id IS NOT NULL THEN
    SELECT * INTO v_customer
      FROM public.customers
     WHERE id = v_q.customer_id
     FOR UPDATE;
  END IF;
  IF v_customer.id IS NULL THEN
    SELECT * INTO v_customer
      FROM public.customers
     WHERE lower(trim(email)) = v_email
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE;
  END IF;
  IF v_customer.id IS NULL THEN
    INSERT INTO public.customers(name,email,phone,company)
    VALUES (trim(v_q.name),v_email,trim(v_q.phone),v_q.company)
    RETURNING * INTO v_customer;
  END IF;

  INSERT INTO public.orders(
    customer_id,customer_name,customer_email,customer_phone,
    subtotal,total_amount,status,notes
  ) VALUES (
    v_customer.id,v_q.name,v_q.email,v_q.phone,
    v_q.subtotal,v_q.total_amount,'confirmed',
    'Converted from quotation ' || coalesce(v_q.quotation_number,v_q.id::text)
  ) RETURNING * INTO v_order;

  FOR v_item IN
    SELECT * FROM public.quotation_items
     WHERE quotation_id = v_q.id
     ORDER BY display_order,id
  LOOP
    INSERT INTO public.order_items(
      order_id,product_id,product_name,quantity,unit,unit_price
    ) VALUES (
      v_order.id,v_item.product_id,v_item.description,
      v_item.quantity,v_item.unit,v_item.unit_price
    );
  END LOOP;

  v_project_title := coalesce(
    nullif(trim(p_project_title),''),
    nullif(trim(v_q.project_type),''),
    'Topline Project - ' || v_q.name
  );
  INSERT INTO public.projects(
    title,slug,client_name,customer_id,quotation_id,order_id,
    project_type,service_type,location,project_date,status,
    project_value,description
  ) VALUES (
    v_project_title,
    lower(regexp_replace(regexp_replace(v_project_title,'[^a-zA-Z0-9]+','-','g'),'^-|-$','','g'))
      || '-' || substr(v_order.id::text,1,8),
    v_q.name,v_customer.id,v_q.id,v_order.id,
    v_q.project_type,v_q.service,v_q.location,current_date,'pending',
    v_q.total_amount,v_q.message
  ) RETURNING * INTO v_project;

  UPDATE public.quotations
     SET status='converted', converted_order_id=v_order.id,
         customer_id=v_customer.id, responded_at=coalesce(responded_at,now()),
         updated_at=now()
   WHERE id=v_q.id;

  IF v_q.lead_id IS NOT NULL THEN
    UPDATE public.leads
       SET status='won',converted_customer_id=v_customer.id,
           converted_quotation_id=v_q.id,outcome='won',updated_at=now()
     WHERE id=v_q.lead_id;
  END IF;

  INSERT INTO public.sales_project_lifecycle_events(
    event_type,lead_id,quotation_id,customer_id,order_id,project_id,
    previous_status,new_status,metadata,actor_user_id
  ) VALUES (
    'quotation_converted',v_q.lead_id,v_q.id,v_customer.id,v_order.id,v_project.id,
    v_q.status,'converted',
    jsonb_build_object('quotation_number',v_q.quotation_number,'total_amount',v_q.total_amount),
    auth.uid()
  );

  RETURN json_build_object(
    'success',true,'order_id',v_order.id,'project_id',v_project.id,
    'customer_id',v_customer.id,'already_converted',false
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.convert_quotation_to_order(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_order(uuid,text) TO authenticated;
