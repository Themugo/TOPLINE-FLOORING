-- Pass 16: accepting a quotation in the portal now creates the order and project straight away
-- (same conversion the admin 'Convert to Order' button performs), so the customer can pay at once.
-- The core has no permission check by design: it is reachable only from respond_to_customer_quotation(),
-- which proves quotation ownership. It is not granted to any browser role.
CREATE OR REPLACE FUNCTION private.convert_quotation_to_order_core(
  p_quotation_id uuid,
  p_project_title text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_item record;
  v_project_title text;
  v_email text;
BEGIN
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

REVOKE ALL ON FUNCTION private.convert_quotation_to_order_core(uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_customer_quotation(
  p_quotation_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_cid uuid := public.get_current_customer_id();
  v_q public.quotations%ROWTYPE;
  v_new text;
  v_note text := left(nullif(trim(coalesce(p_note, '')), ''), 1000);
  v_conv json;
  v_order uuid;
  v_project uuid;
  v_conv_error text;
BEGIN
  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;
  IF p_action NOT IN ('accept', 'decline', 'request_changes') THEN
    RAISE EXCEPTION 'Unknown quotation response';
  END IF;

  SELECT q.* INTO v_q
    FROM public.quotations q
   WHERE q.id = p_quotation_id
     AND (q.customer_id = v_cid
          OR (q.customer_id IS NULL AND lower(trim(q.email)) = lower(trim((SELECT c.email FROM public.customers c WHERE c.id = v_cid)))))
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF v_q.status NOT IN ('quoted', 'sent', 'negotiating') THEN
    RAISE EXCEPTION 'This quotation is no longer open for a response (status: %)', v_q.status;
  END IF;
  IF p_action = 'accept' AND v_q.valid_until IS NOT NULL AND v_q.valid_until < current_date THEN
    RAISE EXCEPTION 'This quotation expired on %. Please request changes and we will refresh it.', v_q.valid_until;
  END IF;
  IF p_action IN ('decline', 'request_changes') AND v_note IS NULL THEN
    RAISE EXCEPTION 'Please tell us briefly why, so we can help';
  END IF;

  v_new := CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'decline' THEN 'rejected' ELSE 'negotiating' END;

  UPDATE public.quotations
     SET status = v_new,
         responded_at = now(),
         message = CASE WHEN v_note IS NULL THEN message
                        ELSE coalesce(message, '') || E'\n\n[Customer response ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' – ' || p_action || '] ' || v_note END
   WHERE id = v_q.id;

  IF p_action = 'accept' THEN
    -- A failed conversion must never undo the customer's acceptance; staff can still convert manually.
    BEGIN
      v_conv := private.convert_quotation_to_order_core(v_q.id, NULL);
      IF coalesce((v_conv->>'success')::boolean, false) THEN
        v_order := (v_conv->>'order_id')::uuid;
        v_project := (v_conv->>'project_id')::uuid;
        v_new := 'converted';
      ELSE
        v_conv_error := v_conv->>'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_conv_error := SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('id', v_q.id, 'status', v_new, 'order_id', v_order, 'project_id', v_project, 'conversion_note', v_conv_error);
END;
$fn$;

REVOKE ALL ON FUNCTION public.respond_to_customer_quotation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_customer_quotation(uuid, text, text) TO authenticated;
