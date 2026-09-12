-- =============================================================
-- Topline Production Storage Setup
-- =============================================================
-- Canonical storage boundary for the `images` bucket.
-- Public users may READ images. Only authenticated Topline staff with
-- media/catalogue permissions may INSERT/UPDATE/DELETE.
--
-- Prefer applying the canonical migration:
--   20260912030000_production_infrastructure_rls_storage.sql
-- This file is retained as an idempotent operator fallback.
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
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
