-- ============================================================
-- 031: Production Security Hardening
-- Fixes broken RLS policies, removes dead RPCs, restricts anon
-- ============================================================

-- 1. Drop dead legacy RPCs that reference dropped admin_settings table
DROP FUNCTION IF EXISTS public.verify_owner_login(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.change_owner_password(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_owner_credentials(text, text) CASCADE;

-- 2. Drop legacy admin_sessions table if it exists (never properly created)
DROP TABLE IF EXISTS public.admin_sessions CASCADE;

-- 3. Fix the leads column name mismatch between migration 020 and 014
-- migration 020 creates leads.customer_name, migration 014's RPC inserts into leads.name
-- Add 'name' as an alias column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN name TEXT;
    -- Copy existing customer_name data to name
    UPDATE public.leads SET name = customer_name WHERE name IS NULL;
    -- Make name NOT NULL with a default for future inserts
    ALTER TABLE public.leads ALTER COLUMN name SET NOT NULL;
    ALTER TABLE public.leads ALTER COLUMN name SET DEFAULT '';
  END IF;
END $$;

-- 4. Fix CMS table admin policies that reference current_user (broken)
-- Drop broken policies first
DROP POLICY IF EXISTS "Admins can manage CMS content" ON public.cms_content;
DROP POLICY IF EXISTS "Admins can manage FAQ items" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;

-- Re-create with proper authenticated-only policies
CREATE POLICY "Authenticated users can manage CMS content"
  ON public.cms_content FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage FAQ items"
  ON public.faq_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage contact messages"
  ON public.contact_messages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 5. Fix enterprise catalog tables that grant anon full access
-- product_collection_relations
DROP POLICY IF EXISTS "Allow all access to anon" ON public.product_collection_relations;
DROP POLICY IF EXISTS "Allow all access to authenticated" ON public.product_collection_relations;
CREATE POLICY "Authenticated full access product_collection_relations"
  ON public.product_collection_relations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- review_images
DROP POLICY IF EXISTS "Allow all access to anon" ON public.review_images;
DROP POLICY IF EXISTS "Allow all access to authenticated" ON public.review_images;
CREATE POLICY "Authenticated full access review_images"
  ON public.review_images FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Fix admin_write_collections, admin_write_reviews, etc.
DROP POLICY IF EXISTS "admin_write_collections" ON public.product_collection_relations;
DROP POLICY IF EXISTS "admin_write_reviews" ON public.review_images;

-- 6. Fix product_reviews INSERT policy that incorrectly compares auth.uid() with customer_id
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Ensure images storage bucket has proper restrictions
-- Update bucket to limit file sizes
UPDATE storage.buckets
SET file_size_limit = 5242880,  -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'images';

-- 8. Add rate limiting metadata to quotations table
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 9. Ensure submit_quotation_request RPC uses correct column names
-- Drop and recreate with proper column mapping
DROP FUNCTION IF EXISTS public.submit_quotation_request(text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_quotation_request(
  p_name text,
  p_email text,
  p_phone text,
  p_county text,
  p_project_type text,
  p_service text,
  p_message text DEFAULT '',
  p_budget_range text DEFAULT '',
  p_timeline text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_quotation_id uuid;
  v_name_trimmed text;
  v_email_trimmed text;
BEGIN
  -- Validate inputs
  v_name_trimmed := trim(p_name);
  v_email_trimmed := trim(p_email);

  IF length(v_name_trimmed) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Name must be at least 2 characters');
  END IF;

  IF length(v_name_trimmed) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Name is too long');
  END IF;

  IF v_email_trimmed !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('success', false, 'error', 'Please provide a valid email address');
  END IF;

  IF length(p_message) > 5000 THEN
    p_message := left(p_message, 5000);
  END IF;

  -- Insert into leads (uses column names from migration 020 schema)
  INSERT INTO public.leads (
    customer_name, email, phone, source, lead_stage, follow_up_notes, project_location
  ) VALUES (
    v_name_trimmed,
    v_email_trimmed,
    trim(p_phone),
    'quotation_request',
    'new',
    format('Service: %s\nBudget: %s\nTimeline: %s\nMessage: %s', p_service, p_budget_range, p_timeline, p_message),
    trim(p_county)
  ) RETURNING id INTO v_lead_id;

  -- Insert into quotations
  INSERT INTO public.quotations (
    customer_name, customer_email, customer_phone,
    project_type, service_type, message,
    status, source
  ) VALUES (
    v_name_trimmed,
    v_email_trimmed,
    trim(p_phone),
    trim(p_project_type),
    trim(p_service),
    p_message,
    'new',
    'website'
  ) RETURNING id INTO v_quotation_id;

  RETURN json_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'quotation_id', v_quotation_id
  );
END;
$$;

-- Grant execute only to anon (for form submissions) and authenticated (for admin)
REVOKE ALL ON FUNCTION public.submit_quotation_request(text, text, text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text, text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text, text, text, text, text, text, text, text, text) TO authenticated;

-- 10. Add input length limits to create_customer_order RPC
-- Drop and recreate with validation
DROP FUNCTION IF EXISTS public.create_customer_order(text, text, text, text, text, jsonb, decimal, uuid);

CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_zone_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_total_amount decimal DEFAULT 0,
  p_delivery_fee decimal DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_calculated_total decimal := 0;
  v_name_trimmed text;
  v_email_trimmed text;
BEGIN
  v_name_trimmed := trim(p_customer_name);
  v_email_trimmed := trim(p_customer_phone);

  -- Validate inputs
  IF length(v_name_trimmed) < 2 OR length(v_name_trimmed) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid customer name');
  END IF;

  IF length(p_customer_phone) > 20 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Cart is empty');
  END IF;

  -- Server-side price validation: calculate total from actual product prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid AND is_active = true;

    IF v_product IS NOT NULL THEN
      v_calculated_total := v_calculated_total + (v_product.price * (v_item->>'quantity')::int);
    END IF;
  END LOOP;

  -- Use server-calculated total, not client-supplied
  IF v_calculated_total <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid order total');
  END IF;

  -- Create or find customer
  INSERT INTO public.customers (name, email, phone, address)
  VALUES (v_name_trimmed, trim(p_customer_email), trim(p_customer_phone), trim(p_delivery_address))
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id FROM public.customers
    WHERE email = trim(p_customer_email) LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, email, phone, address)
    VALUES (v_name_trimmed, trim(p_customer_email), trim(p_customer_phone), trim(p_delivery_address))
    RETURNING id INTO v_customer_id;
  END IF;

  -- Create order with server-calculated total
  INSERT INTO public.orders (
    customer_id, customer_name, customer_email, customer_phone,
    delivery_address, delivery_zone_id, total_amount, delivery_fee,
    status, payment_status
  ) VALUES (
    v_customer_id, v_name_trimmed, trim(p_customer_email), trim(p_customer_phone),
    trim(p_delivery_address), p_delivery_zone_id, v_calculated_total, p_delivery_fee,
    'pending', 'pending'
  ) RETURNING id INTO v_order_id;

  -- Insert order items with server-verified prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      COALESCE(v_item->>'product_name', v_product.name, 'Unknown Product'),
      (v_item->>'quantity')::int,
      v_product.price,
      v_product.price * (v_item->>'quantity')::int
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'total', v_calculated_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_order(text, text, text, text, uuid, jsonb, decimal, decimal) FROM public;
GRANT EXECUTE ON FUNCTION public.create_customer_order(text, text, text, text, uuid, jsonb, decimal, decimal) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_order(text, text, text, text, uuid, jsonb, decimal, decimal) TO authenticated;

-- 11. Add input length limits to validate_coupon
DROP FUNCTION IF EXISTS public.validate_coupon(text, decimal);

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_order_total decimal DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon record;
  v_discount decimal;
BEGIN
  IF length(trim(p_code)) < 1 OR length(trim(p_code)) > 50 THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(code) = upper(trim(p_code))
    AND is_active = true
    AND (end_date IS NULL OR end_date > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_coupon IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired coupon');
  END IF;

  IF v_coupon.min_order_value > 0 AND p_order_total < v_coupon.min_order_value THEN
    RETURN json_build_object('valid', false, 'error', 'Minimum order not met');
  END IF;

  IF v_coupon.coupon_type = 'percentage' THEN
    v_discount := p_order_total * (v_coupon.discount_value / 100);
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;

  -- Increment usage
  UPDATE public.coupons SET current_uses = current_uses + 1 WHERE id = v_coupon.id;

  RETURN json_build_object(
    'valid', true,
    'discount_type', v_coupon.coupon_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'code', v_coupon.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, decimal) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, decimal) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, decimal) TO authenticated;

-- 12. Ensure activity_logs has proper policies
DROP POLICY IF EXISTS "Authenticated can read activity_logs" ON public.activity_logs;
CREATE POLICY "Authenticated can read activity_logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (true);

-- 13. Add proper RLS to any tables that might be missing it
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT t.tablename FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
      AND c.relrelp = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = t.tablename
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl
    );
  END LOOP;
END $$;
