-- Admin management fix: staff must be able to read inactive rows of the public
-- CMS/catalogue tables.
--
-- Root cause: the RBAC foundation migration gave these tables a single SELECT
-- policy ("is_active = true") for everyone, including staff. As a result:
--   * INSERT ... RETURNING of an inactive row fails (admin "Add" reports failure),
--   * deactivating a row makes it vanish from the admin list (cannot re-activate),
--   * admin lists never show inactive items.
-- Additive, permissive SELECT policies for authenticated staff are added; public
-- (anon) visibility is unchanged and no write policy is touched.

DO $$
DECLARE
  m record;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      ('categories','catalog'), ('products','catalog'), ('product_collections','catalog'),
      ('hero_slides','content'), ('testimonials','content'), ('partners','content'),
      ('services','content'), ('navigation_menus','content'), ('theme_settings','content'),
      ('homepage_sections','content'), ('faq_items','content'),
      ('promotions','marketing'), ('delivery_zones','orders'), ('projects','projects')
    ) AS v(tbl, resource)
  LOOP
    IF to_regclass('public.' || m.tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', m.tbl);
      EXECUTE format('DROP POLICY IF EXISTS rbac_staff_read_all_%I ON public.%I', m.tbl, m.tbl);
      EXECUTE format(
        'CREATE POLICY rbac_staff_read_all_%I ON public.%I FOR SELECT TO authenticated USING (private.current_user_has_permission(%L, ''select''))',
        m.tbl, m.tbl, m.resource
      );
    END IF;
  END LOOP;
END $$;

-- Media library private (non-public) items are likewise invisible to staff.
DO $$
BEGIN
  IF to_regclass('public.media_files') IS NOT NULL THEN
    ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rbac_staff_read_all_media_files ON public.media_files;
    CREATE POLICY rbac_staff_read_all_media_files ON public.media_files
      FOR SELECT TO authenticated
      USING (private.current_user_has_permission('media','select'));
  END IF;
END $$;
