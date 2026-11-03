-- Pass 14: staff lost read access to site_settings (and to child rows of draft products)
-- when 20261016150000 narrowed the public read policies to allow-lists.
-- Result: the admin Site Settings page loaded blank, and an upsert (which needs SELECT
-- visibility for its ON CONFLICT path) failed or overwrote real values with defaults.
-- Additive, permission-based SELECT policies for authenticated staff; public visibility unchanged.

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rbac_staff_read_all_site_settings ON public.site_settings;
CREATE POLICY rbac_staff_read_all_site_settings ON public.site_settings
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('content', 'select'));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_variants','product_images','product_specifications',
                           'product_documents','product_tag_relations','product_collection_relations']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS rbac_staff_read_all_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE POLICY rbac_staff_read_all_%I ON public.%I FOR SELECT TO authenticated USING (private.current_user_has_permission(%L, ''select''))',
        t, t, 'catalog');
    END IF;
  END LOOP;
END $$;
