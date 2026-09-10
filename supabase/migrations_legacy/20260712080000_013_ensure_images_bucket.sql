/*
# Ensure Images Storage Bucket Exists (Idempotent Fix)

On at least one deployment, migration 005 (which creates the 'images'
storage bucket) did not end up applied even though later migrations
were - resulting in "bucket not found" errors on every image upload.

This migration is safe to run any number of times, on any project
state, and always ends in the same correct result: a public 'images'
bucket where anyone can view files, but only logged-in admins
(authenticated role) can upload, replace, or delete them - matching the
security model from migration 006, not the older anon-write policies
from 005. If your bucket and policies already exist correctly, running
this changes nothing.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can view images (needed for the site to display them)
DROP POLICY IF EXISTS "anon_read_images_bucket" ON storage.objects;
CREATE POLICY "anon_read_images_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- Upload/edit/delete restricted to logged-in admins only (drop the
-- older anon-write policy names from migration 005 too, in case this
-- runs on a project that only ever had 005 applied and not 006)
DROP POLICY IF EXISTS "anon_insert_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_insert_images_bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "anon_update_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_update_images_bucket" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "anon_delete_images_bucket" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_images_bucket" ON storage.objects;
CREATE POLICY "authenticated_delete_images_bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images');
