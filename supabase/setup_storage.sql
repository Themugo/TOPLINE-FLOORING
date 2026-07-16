-- =============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query
-- =============================================================
-- This creates the 'images' storage bucket and sets up the correct
-- RLS policies. Safe to run multiple times (idempotent).

-- 1. Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Public read: anyone can view images
DROP POLICY IF EXISTS "anon_read_images_bucket" ON storage.objects;
CREATE POLICY "anon_read_images_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- 3. Upload restricted to logged-in admins only
DROP POLICY IF EXISTS "anon_insert_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_insert_images_bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

-- 4. Update restricted to logged-in admins only
DROP POLICY IF EXISTS "anon_update_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_update_images_bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

-- 5. Delete restricted to logged-in admins only
DROP POLICY IF EXISTS "anon_delete_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_delete_images_bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images');
