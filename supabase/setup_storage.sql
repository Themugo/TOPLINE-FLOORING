-- =============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query
-- =============================================================
-- Creates the 'images' storage bucket with permissive policies.
-- Safe to run multiple times (idempotent).

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow EVERYONE to read bucket metadata (fixes "bucket not found")
DROP POLICY IF EXISTS "authenticated_read_buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Public read access to buckets" ON storage.buckets;
CREATE POLICY "Public read access to buckets" ON storage.buckets
  FOR SELECT
  USING (true);

-- 3. Allow EVERYONE to read files in the images bucket
DROP POLICY IF EXISTS "anon_read_images_bucket" ON storage.objects;
CREATE POLICY "anon_read_images_bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- 4. Allow EVERYONE to upload to the images bucket
DROP POLICY IF EXISTS "anon_insert_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_images_bucket" ON storage.objects;
CREATE POLICY "allow_upload_images" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- 5. Allow EVERYONE to update files in the images bucket
DROP POLICY IF EXISTS "anon_update_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_images_bucket" ON storage.objects;
CREATE POLICY "allow_update_images" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'images')
  WITH CHECK (bucket_id = 'images');

-- 6. Allow EVERYONE to delete files in the images bucket
DROP POLICY IF EXISTS "anon_delete_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_images_bucket" ON storage.objects;
CREATE POLICY "allow_delete_images" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'images');
