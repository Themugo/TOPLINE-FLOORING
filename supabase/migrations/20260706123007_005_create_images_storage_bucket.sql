/*
# Create Storage Bucket for Images

1. Storage
- Creates a public storage bucket named 'images' for uploading product images,
  hero slides, project photos, testimonial avatars, partner logos, and any
  other images used throughout the site.
- The bucket is public so anyone accessing the app online can view the images.
- Upload, update, and delete are allowed for anon + authenticated (single-tenant, no auth).

2. Notes
- This is a single-tenant e-commerce site with no user sign-in.
- The admin uses simple sessionStorage-based auth, not Supabase Auth.
- All images stored here are publicly readable by anyone.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files in the images bucket
DROP POLICY IF EXISTS "anon_read_images_bucket" ON storage.objects;
CREATE POLICY "anon_read_images_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- Allow anon + authenticated to upload files
DROP POLICY IF EXISTS "anon_insert_images_bucket" ON storage.objects;
CREATE POLICY "anon_insert_images_bucket" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'images');

-- Allow anon + authenticated to update files
DROP POLICY IF EXISTS "anon_update_images_bucket" ON storage.objects;
CREATE POLICY "anon_update_images_bucket" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

-- Allow anon + authenticated to delete files
DROP POLICY IF EXISTS "anon_delete_images_bucket" ON storage.objects;
CREATE POLICY "anon_delete_images_bucket" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'images');
