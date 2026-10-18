-- TOPLINE 2026-10-16 audit, part 3: unpublished catalogue visibility and internal function exposure.
--
-- Findings fixed here (reproduced as the anon and authenticated roles on a database built from every migration):
--  1. get_payment_provider_release_gate_360() runs with its owner's privileges and was executable by every logged-in customer.
--     It returns production payment-certification evidence, test results and internal notes. Its only caller is the
--     payment-initiate edge function, which uses the service role.
--  2. The public read policies on the product child tables were a bare "true", so variants, images, specifications,
--     documents and tag/collection links of INACTIVE products were readable by anyone. products itself only exposes
--     active rows.
--  3. project_images and project_services were also "true", while the base projects table is staff-only and the
--     public_projects view filters on is_active. Photos and service tags of unpublished or confidential projects
--     were therefore readable directly.
--  4. site_settings was readable in full by anyone, so any future non-public setting would have been exposed by default.
-- Staff keep full visibility through their existing permission-based staff_select policies.

-- Row-level security is asserted explicitly on every table whose policies are redefined below, so a policy can
-- never end up attached to a table that is not enforcing them.
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collection_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 1. Internal release gate: service role only.
REVOKE ALL ON FUNCTION public.get_payment_provider_release_gate_360(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_provider_release_gate_360(text) TO service_role;

-- 2. Product child tables follow the visibility of their product.
DROP POLICY IF EXISTS rbac_public_read_product_variants ON public.product_variants;
CREATE POLICY rbac_public_read_product_variants ON public.product_variants FOR SELECT TO anon, authenticated
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_active = true));

DROP POLICY IF EXISTS rbac_public_read_product_images ON public.product_images;
CREATE POLICY rbac_public_read_product_images ON public.product_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_active = true));

DROP POLICY IF EXISTS rbac_public_read_product_specifications ON public.product_specifications;
CREATE POLICY rbac_public_read_product_specifications ON public.product_specifications FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_specifications.product_id AND p.is_active = true));

DROP POLICY IF EXISTS rbac_public_read_product_documents ON public.product_documents;
CREATE POLICY rbac_public_read_product_documents ON public.product_documents FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_documents.product_id AND p.is_active = true));

DROP POLICY IF EXISTS rbac_public_read_product_tag_relations ON public.product_tag_relations;
CREATE POLICY rbac_public_read_product_tag_relations ON public.product_tag_relations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_tag_relations.product_id AND p.is_active = true));

DROP POLICY IF EXISTS rbac_public_read_product_collection_relations ON public.product_collection_relations;
CREATE POLICY rbac_public_read_product_collection_relations ON public.product_collection_relations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_collection_relations.product_id AND p.is_active = true));

-- 3. Project child tables follow the published-projects view (the base projects table is staff-only, and a
--    subquery against it would itself be filtered out for browser roles, so the view is used).
DROP POLICY IF EXISTS rbac_public_read_project_images ON public.project_images;
CREATE POLICY rbac_public_read_project_images ON public.project_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_projects pp WHERE pp.id = project_images.project_id));

DROP POLICY IF EXISTS rbac_public_read_project_services ON public.project_services;
CREATE POLICY rbac_public_read_project_services ON public.project_services FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_projects pp WHERE pp.id = project_services.project_id));

-- Staff previously saw these tables through the public policy. Give them an explicit permission-based read
-- so tightening the public rule does not hide unpublished galleries from the people who manage them.
DROP POLICY IF EXISTS staff_select ON public.project_images;
CREATE POLICY staff_select ON public.project_images FOR SELECT TO authenticated
  USING (private.current_user_has_permission('projects'::text, 'select'::text));

DROP POLICY IF EXISTS staff_select ON public.project_services;
CREATE POLICY staff_select ON public.project_services FOR SELECT TO authenticated
  USING (private.current_user_has_permission('projects'::text, 'select'::text));

-- 4. Public settings are an allow-list, not the whole table.
DROP POLICY IF EXISTS rbac_public_read_site_settings ON public.site_settings;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated
  USING (setting_key IN ('custom_css'));
COMMENT ON POLICY site_settings_public_read ON public.site_settings IS
  'Browser roles may read only allow-listed public settings. Add a key here deliberately; never expose the whole table.';
