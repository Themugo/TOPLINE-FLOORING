-- Phase 12: customer portal identity binding and private customer data access.
-- Supabase Auth remains the identity provider; no passwords are stored by Topline.

CREATE OR REPLACE FUNCTION public.link_customer_portal_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE matched_customer uuid;
BEGIN
  SELECT id INTO matched_customer
  FROM public.customers
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at ASC
  LIMIT 1;

  IF matched_customer IS NOT NULL THEN
    INSERT INTO public.customer_portal_access(customer_id, auth_user_id, is_active, last_login)
    VALUES (matched_customer, NEW.id, true, now())
    ON CONFLICT (customer_id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, is_active = true, last_login = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_customer_portal ON auth.users;
CREATE TRIGGER on_auth_user_customer_portal
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_customer_portal_user();

CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.customer_portal_access
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_portal_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cid uuid;
BEGIN
  cid := public.get_current_customer_id();
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;

  UPDATE public.customer_portal_access SET last_login = now() WHERE auth_user_id = auth.uid();

  RETURN jsonb_build_object(
    'customer', (SELECT to_jsonb(c) FROM public.customers c WHERE c.id = cid),
    'quotations', COALESCE((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM public.quotations q WHERE lower(q.email) = lower((SELECT email FROM public.customers WHERE id = cid))), '[]'::jsonb),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', o.id, 'order_number', o.order_number, 'status', o.status, 'total_amount', o.total_amount, 'created_at', o.created_at,
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('product_name', oi.product_name, 'quantity', oi.quantity, 'unit', oi.unit, 'unit_price', oi.unit_price) ORDER BY oi.created_at) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
    ) ORDER BY o.created_at DESC) FROM public.orders o WHERE o.customer_id = cid OR (o.customer_id IS NULL AND lower(o.customer_email) = lower((SELECT email FROM public.customers WHERE id = cid)))), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_portal_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_portal_data() TO authenticated;

ALTER TABLE public.customer_portal_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_portal_self_select ON public.customer_portal_access;
CREATE POLICY customer_portal_self_select ON public.customer_portal_access FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_portal_self_select ON public.customers;
CREATE POLICY customers_portal_self_select ON public.customers FOR SELECT TO authenticated USING (id = public.get_current_customer_id());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_portal_self_select ON public.orders;
CREATE POLICY orders_portal_self_select ON public.orders FOR SELECT TO authenticated USING (customer_id = public.get_current_customer_id());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_items_portal_self_select ON public.order_items;
CREATE POLICY order_items_portal_self_select ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = public.get_current_customer_id()));

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotations_portal_self_select ON public.quotations;
CREATE POLICY quotations_portal_self_select ON public.quotations FOR SELECT TO authenticated USING (lower(email) = lower((SELECT email FROM public.customers WHERE id = public.get_current_customer_id())));
