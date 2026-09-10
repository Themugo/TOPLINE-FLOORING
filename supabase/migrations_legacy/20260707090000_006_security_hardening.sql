/*
# Security Hardening: Real Admin Auth + Correct RLS

Problem being fixed
--------------------
Every table so far has policies like:
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)
This means the public anon key (which ships inside the compiled frontend
bundle for everyone to see) can read AND write every table, including:
  - admin_settings, which stored the admin username/password in plain text
  - customers, orders, order_items (full customer PII, readable by anyone)
  - every content table (products, categories, etc. could be vandalised
    or deleted by anyone who opens devtools)
Admin "login" was purely a sessionStorage flag checked in the browser,
with no server-side enforcement at all - trivially bypassed via
`sessionStorage.setItem('topline_admin_auth', 'true')` in devtools.

This migration:
1. Switches admin auth to real Supabase Auth (email + password, JWT-backed).
2. Rewrites RLS so that:
   - Storefront content is public READ ONLY (anon + authenticated may SELECT).
   - All WRITES to content/config/ops tables require an authenticated
     Supabase Auth session (i.e. a logged-in admin).
   - Customer PII tables (customers, orders, order_items) can only be
     inserted by the public (checkout flow) and can only be
     read/updated/deleted by an authenticated admin.
   - Fully internal tables (admin_settings, inventory, coupons, deliveries,
     media_folders, activity_logs) are authenticated-only for everything.
3. Adds a SECURITY DEFINER RPC (`create_customer_order`) so the checkout
   flow can create a customer + order + order_items atomically as `anon`
   without needing a broad SELECT policy on those PII tables (Postgres
   RLS requires SELECT rights to use `.select()`/RETURNING after an
   INSERT, which we deliberately do NOT want to grant to anon here).
4. Locks down the `images` storage bucket so uploads/updates/deletes
   require an authenticated session; public read is unchanged.

Important manual step (cannot be done from SQL alone)
-------------------------------------------------------
You must create the real admin user in Supabase Auth yourself
(Dashboard -> Authentication -> Users -> Add User), then log in with
those credentials at /admin/login. See the deployment notes provided
separately for exact steps. The old `admin_settings` username/password
rows are no longer used for authentication and are removed below.
*/

-- ============================================================
-- 1. Helper: is the current request from a logged-in admin?
-- ============================================================
-- Every admin in this single-tenant app is an authenticated Supabase
-- Auth user, so "authenticated" == "admin" here. This function just
-- gives policies a readable name instead of repeating auth.role() checks.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role() = 'authenticated';
$$;

-- ============================================================
-- 2. Drop the old admin_settings plaintext-credential rows
--    (auth is now handled entirely by Supabase Auth)
-- ============================================================
DELETE FROM admin_settings WHERE setting_key IN ('admin_username', 'admin_password');

-- Lock admin_settings down completely: authenticated only, for anything
-- that still legitimately lives there.
DROP POLICY IF EXISTS "anon_access_admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_all" ON admin_settings;
CREATE POLICY "admin_settings_all" ON admin_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Public-read / admin-write content tables
-- ============================================================
-- Small helper macro pattern repeated per table:
--   SELECT policy -> anon + authenticated, USING (true) [or is_active filter]
--   ALL/write policy -> authenticated only

-- categories
DROP POLICY IF EXISTS "anon_write_categories" ON categories;
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (true);

-- products
DROP POLICY IF EXISTS "anon_write_products" ON products;
DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated USING (true);

-- hero_slides
DROP POLICY IF EXISTS "anon_write_hero_slides" ON hero_slides;
DROP POLICY IF EXISTS "anon_read_hero_slides" ON hero_slides;
CREATE POLICY "public_read_hero_slides" ON hero_slides FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_hero_slides" ON hero_slides FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- testimonials
DROP POLICY IF EXISTS "anon_write_testimonials" ON testimonials;
DROP POLICY IF EXISTS "anon_read_testimonials" ON testimonials;
CREATE POLICY "public_read_testimonials" ON testimonials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_testimonials" ON testimonials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- partners
DROP POLICY IF EXISTS "anon_write_partners" ON partners;
DROP POLICY IF EXISTS "anon_read_partners" ON partners;
CREATE POLICY "public_read_partners" ON partners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_partners" ON partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- services
DROP POLICY IF EXISTS "admin_write_services" ON services;
DROP POLICY IF EXISTS "public_read_services" ON services;
CREATE POLICY "public_read_services" ON services FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_services" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_inactive_services" ON services FOR SELECT TO authenticated USING (true);

-- site_settings (public needs to read for header/footer/SEO defaults)
DROP POLICY IF EXISTS "public_access_site_settings" ON site_settings;
CREATE POLICY "public_read_site_settings" ON site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_site_settings" ON site_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_site_settings" ON site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_site_settings" ON site_settings FOR DELETE TO authenticated USING (true);

-- theme_settings (public needs to read active theme to render colors/fonts)
DROP POLICY IF EXISTS "public_access_theme" ON theme_settings;
CREATE POLICY "public_read_theme" ON theme_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_theme" ON theme_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_theme" ON theme_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_theme" ON theme_settings FOR DELETE TO authenticated USING (true);

-- navigation_menus
DROP POLICY IF EXISTS "admin_write_navigation" ON navigation_menus;
DROP POLICY IF EXISTS "public_read_navigation" ON navigation_menus;
CREATE POLICY "public_read_navigation" ON navigation_menus FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_navigation" ON navigation_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_all_navigation" ON navigation_menus FOR SELECT TO authenticated USING (true);

-- homepage_sections
DROP POLICY IF EXISTS "admin_write_sections" ON homepage_sections;
DROP POLICY IF EXISTS "public_read_sections" ON homepage_sections;
CREATE POLICY "public_read_sections" ON homepage_sections FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_sections" ON homepage_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_all_sections" ON homepage_sections FOR SELECT TO authenticated USING (true);

-- product_images / specs / variants / documents / tags / relations / brands
DROP POLICY IF EXISTS "public_access_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_product_images" ON product_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_product_images" ON product_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_product_images" ON product_images FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public_access_specifications" ON product_specifications;
CREATE POLICY "public_read_specifications" ON product_specifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_specifications" ON product_specifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_variants" ON product_variants;
CREATE POLICY "public_read_variants" ON product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_variants" ON product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_documents" ON product_documents;
CREATE POLICY "public_read_documents" ON product_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_documents" ON product_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_tags" ON product_tags;
CREATE POLICY "public_read_tags" ON product_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_tags" ON product_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_tag_relations" ON product_tag_relations;
CREATE POLICY "public_read_tag_relations" ON product_tag_relations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_tag_relations" ON product_tag_relations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_brands" ON product_brands;
CREATE POLICY "public_read_brands" ON product_brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_brands" ON product_brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- delivery_zones
DROP POLICY IF EXISTS "admin_write_delivery_zones" ON delivery_zones;
DROP POLICY IF EXISTS "public_read_delivery_zones" ON delivery_zones;
CREATE POLICY "public_read_delivery_zones" ON delivery_zones FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_delivery_zones" ON delivery_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_all_delivery_zones" ON delivery_zones FOR SELECT TO authenticated USING (true);

-- promotions
DROP POLICY IF EXISTS "admin_write_promotions" ON promotions;
DROP POLICY IF EXISTS "public_read_promotions" ON promotions;
CREATE POLICY "public_read_promotions" ON promotions FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_promotions" ON promotions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_all_promotions" ON promotions FOR SELECT TO authenticated USING (true);

-- projects / project_images / project_services
DROP POLICY IF EXISTS "admin_write_projects" ON projects;
DROP POLICY IF EXISTS "public_read_projects" ON projects;
CREATE POLICY "public_read_projects" ON projects FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_all_projects" ON projects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "public_access_project_images" ON project_images;
CREATE POLICY "public_read_project_images" ON project_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_project_images" ON project_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_project_services" ON project_services;
CREATE POLICY "public_read_project_services" ON project_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_project_services" ON project_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- media_files (public read only rows explicitly marked public)
DROP POLICY IF EXISTS "admin_write_media" ON media_files;
DROP POLICY IF EXISTS "public_read_media" ON media_files;
CREATE POLICY "public_read_media" ON media_files FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "admin_write_media" ON media_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_all_media" ON media_files FOR SELECT TO authenticated USING (true);

-- seo_pages (public needs to read meta tags for each page)
DROP POLICY IF EXISTS "admin_access_seo" ON seo_pages;
CREATE POLICY "public_read_seo" ON seo_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_write_seo" ON seo_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_seo" ON seo_pages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_seo" ON seo_pages FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 4. Fully internal / back-office tables: authenticated only
-- ============================================================
DROP POLICY IF EXISTS "admin_access_media" ON media_folders;
CREATE POLICY "admin_access_media_folders" ON media_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_inventory" ON inventory_movements;
CREATE POLICY "admin_access_inventory" ON inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_alerts" ON inventory_alerts;
CREATE POLICY "admin_access_alerts" ON inventory_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_deliveries" ON deliveries;
CREATE POLICY "admin_access_deliveries" ON deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_coupons" ON coupons;
CREATE POLICY "admin_access_coupons" ON coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_logs" ON activity_logs;
CREATE POLICY "admin_access_logs" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Customer PII tables: anon can only INSERT (via RPC below for
--    orders; direct INSERT for quotations which need no RETURNING).
--    All reads/updates/deletes require an authenticated admin.
-- ============================================================
DROP POLICY IF EXISTS "anon_access_customers" ON customers;
CREATE POLICY "admin_read_customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_update_customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_customers" ON customers FOR DELETE TO authenticated USING (true);
-- NOTE: no anon INSERT policy here on purpose - customer rows are only
-- created through the create_customer_order() RPC (SECURITY DEFINER),
-- never via a direct table insert from the browser.

DROP POLICY IF EXISTS "anon_access_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_update_orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_orders" ON orders FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_access_order_items" ON order_items;
CREATE POLICY "admin_read_order_items" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_update_order_items" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_order_items" ON order_items FOR DELETE TO authenticated USING (true);

-- quotations: anon may only INSERT (no .select() used by the frontend
-- after insert, so no RETURNING/SELECT policy is needed for anon).
DROP POLICY IF EXISTS "anon_access_quotations" ON quotations;
CREATE POLICY "anon_insert_quotations" ON quotations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin_read_quotations" ON quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_update_quotations" ON quotations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_quotations" ON quotations FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 6. Checkout RPC: lets an anonymous shopper place an order without
--    ever needing SELECT/UPDATE/DELETE rights on customers/orders.
--    Runs as SECURITY DEFINER (owner privileges), bypassing RLS
--    internally, but only does exactly this one well-defined thing.
-- ============================================================
CREATE OR REPLACE FUNCTION create_customer_order(
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_total_amount decimal,
  p_items jsonb -- [{ product_id, product_name, quantity, unit_price }, ...]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'a valid email is required';
  END IF;
  IF p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
    RAISE EXCEPTION 'phone is required';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'at least one order item is required';
  END IF;

  INSERT INTO customers (name, email, phone)
  VALUES (p_name, p_email, p_phone)
  RETURNING id INTO v_customer_id;

  INSERT INTO orders (customer_id, customer_name, customer_email, customer_phone, total_amount, notes, status)
  VALUES (v_customer_id, p_name, p_email, p_phone, p_total_amount, p_notes, 'pending')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::decimal
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Only allow this function to be called by anon/authenticated web clients,
-- never by "public" (which would include unauthenticated Postgres roles).
REVOKE ALL ON FUNCTION create_customer_order(text, text, text, text, decimal, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_customer_order(text, text, text, text, decimal, jsonb) TO anon, authenticated;

-- ============================================================
-- 7. Storage: public read, authenticated-only write on the images bucket
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_insert_images_bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "anon_update_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_update_images_bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "anon_delete_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_delete_images_bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images');
-- anon_read_images_bucket (public SELECT) from migration 005 is unchanged.
