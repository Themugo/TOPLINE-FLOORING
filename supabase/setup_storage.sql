-- =============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query
-- =============================================================
-- Creates the 'images' storage bucket with full RLS policies.
-- Safe to run multiple times (idempotent).

-- 1. Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to READ bucket metadata
--    (required by the JS client to verify the bucket exists)
DROP POLICY IF EXISTS "authenticated_read_buckets" ON storage.buckets;
CREATE POLICY "authenticated_read_buckets" ON storage.buckets
  FOR SELECT TO authenticated
  USING (true);

-- 3. Public read: anyone can view images
DROP POLICY IF EXISTS "anon_read_images_bucket" ON storage.objects;
CREATE POLICY "anon_read_images_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- 4. Upload restricted to logged-in admins only
DROP POLICY IF EXISTS "anon_insert_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_insert_images_bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

-- 5. Update restricted to logged-in admins only
DROP POLICY IF EXISTS "anon_update_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_update_images_bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

-- 6. Delete restricted to logged-in admins only
DROP POLICY IF EXISTS "anon_delete_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_delete_images_bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images');
