-- ============================================================
-- Phase 2: Production Infrastructure — RLS + Storage Boundary
--
-- Goal:
--   Put the complete canonical Topline public schema behind an explicit
--   least-privilege RLS boundary before production data is loaded.
--
-- Public website data is read-only to anon/authenticated where explicitly
-- listed below. Business/finance/staff data is staff-permission controlled.
-- Public writes are limited to intentional lead/quote/contact/page-visit
-- intake surfaces; transactional orders are created through RPCs.
--
-- Storage:
--   images bucket is public-read only. Writes require authenticated Topline
--   staff with media/catalog permissions. The browser never receives a
--   service-role credential.
-- ============================================================

-- ------------------------------------------------------------
-- Public catalogue/content read surfaces
-- ------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories','product_brands','products','product_variants','product_images',
    'product_specifications','product_documents','product_tags','product_tag_relations',
    'product_collections','product_collection_relations','delivery_zones',
    'promotions','navigation_menus','theme_settings','homepage_sections','hero_slides',
    'testimonials','partners','cms_content','faq_items','services','projects',
    'project_services','project_images','seo_pages'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I', t);
    EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- Product reviews are public only when approved; moderation remains staff-only.
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_reviews TO anon, authenticated;
DROP POLICY IF EXISTS product_reviews_public_read ON public.product_reviews;
CREATE POLICY product_reviews_public_read ON public.product_reviews
  FOR SELECT TO anon, authenticated USING (is_approved = true);

ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.review_images TO anon, authenticated;
DROP POLICY IF EXISTS review_images_public_read ON public.review_images;
CREATE POLICY review_images_public_read ON public.review_images
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.product_reviews r WHERE r.id = review_images.review_id AND r.is_approved = true));

-- Site settings contains public website configuration, but writes remain staff-only.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

-- ------------------------------------------------------------
-- Controlled public intake surfaces
-- ------------------------------------------------------------
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.contact_messages TO anon, authenticated;
DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;
CREATE POLICY contact_messages_public_insert ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    nullif(trim(name),'') IS NOT NULL
    AND nullif(trim(email),'') IS NOT NULL
    AND nullif(trim(message),'') IS NOT NULL
  );

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.leads TO anon, authenticated;
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
CREATE POLICY leads_public_insert ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    nullif(trim(name),'') IS NOT NULL
    AND nullif(trim(email),'') IS NOT NULL
  );

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.quotations TO anon, authenticated;
DROP POLICY IF EXISTS quotations_public_insert ON public.quotations;
CREATE POLICY quotations_public_insert ON public.quotations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    nullif(trim(name),'') IS NOT NULL
    AND nullif(trim(email),'') IS NOT NULL
    AND nullif(trim(phone),'') IS NOT NULL
  );

-- ------------------------------------------------------------
-- Staff-controlled operational tables without previous RLS
-- ------------------------------------------------------------
-- Four separate policies are used instead of a broad FOR ALL policy so that
-- SELECT permission cannot accidentally imply UPDATE/DELETE permission.

DO $$
DECLARE rec record;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('categories','catalog'),('product_brands','catalog'),('products','catalog'),
    ('product_variants','catalog'),('product_images','catalog'),('product_specifications','catalog'),
    ('product_documents','catalog'),('product_tags','catalog'),('product_tag_relations','catalog'),
    ('product_collections','catalog'),('product_collection_relations','catalog'),('product_comparisons','catalog'),
    ('navigation_menus','content'),('theme_settings','content'),('homepage_sections','content'),
    ('hero_slides','content'),('testimonials','content'),('partners','content'),('cms_content','content'),
    ('faq_items','content'),('services','content'),('seo_pages','content'),
    ('promotions','marketing'),('coupons','marketing'),('product_reviews','marketing'),('review_images','marketing'),
    ('communication_history','customers'),('customer_addresses','customers'),('customer_contact_persons','customers'),
    ('customer_documents','customers'),('customer_notes','customers'),('customer_preferences','customers'),
    ('lead_notes','leads'),('lead_reminders','leads'),('leads','leads'),
    ('quotations','quotations'),('quotation_items','quotations'),
    ('orders','orders'),('order_items','orders'),('deliveries','orders'),
    ('projects','projects'),('project_services','projects'),('project_images','projects'),
    ('site_visits','projects'),('installations','projects'),
    ('invoices','invoices'),('invoice_items','invoices'),
    ('payments','payments'),
    ('materials','inventory'),('inventory_movements','inventory'),('inventory_alerts','inventory'),
    ('stock_movements','inventory'),('stock_transfers','inventory'),('warehouse_stock','inventory'),
    ('suppliers','procurement'),('purchase_orders','procurement'),('purchase_order_items','procurement'),
    ('warehouses','warehouses')
  ) AS x(table_name, resource) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', rec.table_name);

    EXECUTE format('DROP POLICY IF EXISTS staff_select ON public.%I', rec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS staff_insert ON public.%I', rec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS staff_update ON public.%I', rec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS staff_delete ON public.%I', rec.table_name);

    EXECUTE format('CREATE POLICY staff_select ON public.%I FOR SELECT TO authenticated USING (private.current_user_has_permission(%L,''select''))', rec.table_name, rec.resource);
    EXECUTE format('CREATE POLICY staff_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission(%L,''insert''))', rec.table_name, rec.resource);
    EXECUTE format('CREATE POLICY staff_update ON public.%I FOR UPDATE TO authenticated USING (private.current_user_has_permission(%L,''update'')) WITH CHECK (private.current_user_has_permission(%L,''update''))', rec.table_name, rec.resource, rec.resource);
    EXECUTE format('CREATE POLICY staff_delete ON public.%I FOR DELETE TO authenticated USING (private.current_user_has_permission(%L,''delete''))', rec.table_name, rec.resource);
  END LOOP;
END $$;

-- Customer table has separate portal self-read policy from Phase 12 and
-- staff CRUD access from the customers permission set.
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
DROP POLICY IF EXISTS staff_select ON public.customers;
DROP POLICY IF EXISTS staff_insert ON public.customers;
DROP POLICY IF EXISTS staff_update ON public.customers;
DROP POLICY IF EXISTS staff_delete ON public.customers;
CREATE POLICY staff_select ON public.customers FOR SELECT TO authenticated USING (private.current_user_has_permission('customers','select'));
CREATE POLICY staff_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('customers','insert'));
CREATE POLICY staff_update ON public.customers FOR UPDATE TO authenticated USING (private.current_user_has_permission('customers','update')) WITH CHECK (private.current_user_has_permission('customers','update'));
CREATE POLICY staff_delete ON public.customers FOR DELETE TO authenticated USING (private.current_user_has_permission('customers','delete'));

-- Contact submissions are write-only from the public side; staff can review
-- them through the customer permission boundary if an admin surface needs it.
GRANT SELECT ON public.contact_messages TO authenticated;
DROP POLICY IF EXISTS contact_messages_staff_select ON public.contact_messages;
CREATE POLICY contact_messages_staff_select ON public.contact_messages
  FOR SELECT TO authenticated USING (private.current_user_has_permission('customers','select'));

-- Activity/audit data is append-only from application functions and readable
-- only by users with the audit permission.
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.activity_logs TO authenticated;
DROP POLICY IF EXISTS staff_audit_read ON public.activity_logs;
CREATE POLICY staff_audit_read ON public.activity_logs FOR SELECT TO authenticated
  USING (private.current_user_has_permission('audit','select'));

ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.dashboard_metrics TO authenticated;
DROP POLICY IF EXISTS staff_reports_read ON public.dashboard_metrics;
CREATE POLICY staff_reports_read ON public.dashboard_metrics FOR SELECT TO authenticated
  USING (private.current_user_has_permission('reports','select'));

-- ------------------------------------------------------------
-- Customer self-service tables
-- ------------------------------------------------------------
-- These tables are intentionally not made broadly public. Portal RPCs can
-- expose the minimum customer view without granting direct access to all
-- customer documents/notes/preferences.

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ------------------------------------------------------------
-- Storage boundary
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('images','images',true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Topline public read images" ON storage.objects;
CREATE POLICY "Topline public read images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Topline staff upload images" ON storage.objects;
CREATE POLICY "Topline staff upload images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (
      private.current_user_has_permission('media','insert')
      OR private.current_user_has_permission('catalog','insert')
    )
  );

DROP POLICY IF EXISTS "Topline staff update images" ON storage.objects;
CREATE POLICY "Topline staff update images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'images'
    AND (
      private.current_user_has_permission('media','update')
      OR private.current_user_has_permission('catalog','update')
    )
  )
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Topline staff delete images" ON storage.objects;
CREATE POLICY "Topline staff delete images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'images'
    AND (
      private.current_user_has_permission('media','delete')
      OR private.current_user_has_permission('catalog','delete')
    )
  );

-- The old standalone setup_storage.sql is retained only as historical input;
-- this migration is the canonical production storage policy.
