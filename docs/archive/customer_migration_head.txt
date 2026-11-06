-- Customer registration and safe Auth -> customer reconciliation.
-- New customer profiles are created from verified Supabase Auth identity metadata;
-- portal access is still granted only after email confirmation and a unique email match.

CREATE OR REPLACE FUNCTION public.prepare_customer_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  registration_requested boolean;
  existing_count integer;
  existing_customer uuid;
  registration_name text;
  registration_phone text;
  registration_company text;
BEGIN
  registration_requested := COALESCE((NEW.raw_user_meta_data ->> 'topline_customer_registration')::boolean, false);
  IF NOT registration_requested OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  registration_name := NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), '');
  registration_phone := NULLIF(trim(NEW.raw_user_meta_data ->> 'phone'), '');
  registration_company := NULLIF(trim(NEW.raw_user_meta_data ->> 'company'), '');

  IF registration_name IS NULL OR registration_phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*), min(c.id)
    INTO existing_count, existing_customer
    FROM public.customers c
   WHERE lower(trim(c.email)) = lower(trim(NEW.email));

  IF existing_count = 1 THEN
    RETURN NEW;
  END IF;

  IF existing_count = 0 THEN
    INSERT INTO public.customers(name, email, phone, company, notes)
    VALUES (
      registration_name,
      lower(trim(NEW.email)),
      registration_phone,
      registration_company,
      'Self-registered customer account; pending email verification.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_customer_registration ON auth.users;
CREATE TRIGGER on_auth_user_customer_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.prepare_customer_registration();

CREATE OR REPLACE FUNCTION public.link_customer_portal_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_customer uuid;
  matched_count integer;
  existing_customer uuid;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.id, count(*) OVER ()
    INTO matched_customer, matched_count
    FROM public.customers c
   WHERE lower(trim(c.email)) = lower(trim(NEW.email))
   ORDER BY c.created_at ASC
   LIMIT 1;

  IF matched_count <> 1 OR matched_customer IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cpa.customer_id
    INTO existing_customer
    FROM public.customer_portal_access cpa
   WHERE cpa.auth_user_id = NEW.id AND cpa.is_active = true
   LIMIT 1;

  IF existing_customer IS NOT NULL THEN
    UPDATE public.customer_portal_access
       SET last_login = now()
     WHERE auth_user_id = NEW.id AND customer_id = matched_customer;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.customer_portal_access cpa
     WHERE cpa.customer_id = matched_customer AND cpa.is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_portal_access(customer_id, auth_user_id, is_active, last_login)
  VALUES(matched_customer, NEW.id, true, now())
  ON CONFLICT(customer_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_customer_portal ON auth.users;
CREATE TRIGGER on_auth_user_customer_portal
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_customer_portal_user();

REVOKE ALL ON FUNCTION public.prepare_customer_registration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_customer_portal_user() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.prepare_customer_registration() IS 'Creates a customer profile only for an Auth registration explicitly marked as a Topline customer registration; never grants portal access.';
COMMENT ON FUNCTION public.link_customer_portal_user() IS 'Binds verified Auth identity to exactly one customer with a unique normalized email match; never rebinds an active identity.';

-- Expand the canonical customer portal quotation payload so existing quotations are genuinely viewable.
CREATE OR REPLACE FUNCTION public.get_customer_portal_360()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE cid uuid;
BEGIN
  cid := public.get_current_customer_id();
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;

  RETURN jsonb_build_object(
    'customer', (SELECT to_jsonb(c) FROM public.customers c WHERE c.id = cid),
    'quotations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',q.id,'quotation_number',q.quotation_number,'project_type',q.project_type,'service',q.service,
      'status',q.status,'total_amount',q.total_amount,'created_at',q.created_at,
      'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('description',qi.description,'quantity',qi.quantity,'unit',qi.unit,'unit_price',qi.unit_price,'line_total',qi.line_total) ORDER BY qi.display_order,qi.created_at) FROM public.quotation_items qi WHERE qi.quotation_id=q.id),'[]'::jsonb)
    ) ORDER BY q.created_at DESC) FROM public.quotations q WHERE q.customer_id=cid OR (q.customer_id IS NULL AND lower(q.email)=lower((SELECT c.email FROM public.customers c WHERE c.id=cid)))), '[]'::jsonb),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'total_amount',o.total_amount,'created_at',o.created_at,'notes',o.notes,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_name',oi.product_name,'quantity',oi.quantity,'unit',oi.unit,'unit_price',oi.unit_price) ORDER BY oi.created_at) FROM public.order_items oi WHERE oi.order_id=o.id),'[]'::jsonb)) ORDER BY o.created_at DESC) FROM public.orders o WHERE o.customer_id=cid OR (o.customer_id IS NULL AND lower(o.customer_email)=lower((SELECT c.email FROM public.customers c WHERE c.id=cid)))), '[]'::jsonb),
    'projects', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'project_number',p.project_number,'title',p.title,'project_type',p.project_type,'service_type',p.service_type,'location',p.location,'status',p.status,'progress_percentage',p.progress_percentage,'progress_notes',p.progress_notes,'start_date',p.start_date,'end_date',p.end_date,'completion_date',p.completion_date,'project_value',p.project_value,'description',p.description,'completion_notes',p.completion_notes) ORDER BY p.created_at DESC) FROM public.projects p WHERE p.customer_id=cid),'[]'::jsonb),
    'invoices', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'invoice_number',i.invoice_number,'status',i.status,'subtotal',i.subtotal,'tax_amount',i.tax_amount,'total_amount',i.total_amount,'amount_paid',i.amount_paid,'due_date',i.due_date,'pdf_url',i.pdf_url,'created_at',i.created_at,'notes',i.notes,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('description',ii.description,'quantity',ii.quantity,'unit_price',ii.unit_price,'line_total',ii.line_total) ORDER BY ii.display_order,ii.created_at) FROM public.invoice_items ii WHERE ii.invoice_id=i.id),'[]'::jsonb)) ORDER BY i.created_at DESC) FROM public.invoices i WHERE i.customer_id=cid),'[]'::jsonb),
    'service_cases', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'case_number',s.case_number,'type',s.type,'status',s.status,'priority',s.priority,'issue_title',s.issue_title,'description',s.description,'reported_at',s.reported_at,'scheduled_date',s.scheduled_date,'resolution',s.resolution,'resolved_at',s.resolved_at,'project_id',s.project_id,'order_id',s.order_id) ORDER BY s.created_at DESC) FROM public.service_cases s WHERE s.customer_id=cid),'[]'::jsonb),
    'site_visits', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'scheduled_date',v.scheduled_date,'scheduled_time',v.scheduled_time,'visit_type',v.visit_type,'status',v.status,'visit_notes',v.visit_notes,'project_id',v.project_id,'quotation_id',v.quotation_id) ORDER BY v.scheduled_date DESC NULLS LAST,v.created_at DESC) FROM public.site_visits v WHERE v.customer_id=cid),'[]'::jsonb),
    'installations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ins.id,'installation_number',ins.installation_number,'scheduled_date',ins.scheduled_date,'scheduled_time',ins.scheduled_time,'status',ins.status,'notes',ins.notes,'progress_photos',ins.progress_photos,'customer_confirmation',ins.customer_confirmation,'completion_certificate',ins.completion_certificate,'project_id',ins.project_id,'order_id',ins.order_id) ORDER BY ins.scheduled_date DESC NULLS LAST,ins.created_at DESC) FROM public.installations ins LEFT JOIN public.projects p ON p.id=ins.project_id LEFT JOIN public.orders o ON o.id=ins.order_id WHERE p.customer_id=cid OR o.customer_id=cid),'[]'::jsonb),
    'summary', jsonb_build_object('active_projects',(SELECT count(*) FROM public.projects p WHERE p.customer_id=cid AND p.status IN ('pending','scheduled','in_progress')),'open_orders',(SELECT count(*) FROM public.orders o WHERE o.customer_id=cid AND o.status NOT IN ('completed','cancelled')),'outstanding_invoices',COALESCE((SELECT sum(GREATEST(i.total_amount-i.amount_paid,0)) FROM public.invoices i WHERE i.customer_id=cid AND i.status NOT IN ('paid','cancelled')),0),'open_service_cases',(SELECT count(*) FROM public.service_cases s WHERE s.customer_id=cid AND s.status NOT IN ('resolved','closed','rejected')))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_customer_portal_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_portal_360() TO authenticated;
