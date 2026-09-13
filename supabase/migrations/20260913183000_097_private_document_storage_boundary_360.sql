-- Private document storage boundary. Existing public images bucket remains public for website/catalog media.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('private-documents','private-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Topline private documents read" ON storage.objects;
CREATE POLICY "Topline private documents read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='private-documents' AND (private.current_user_has_permission('media','select') OR EXISTS (SELECT 1 FROM public.customer_portal_access cpa WHERE cpa.auth_user_id=(select auth.uid()) AND split_part(name,'/',1)=cpa.customer_id::text)));
DROP POLICY IF EXISTS "Topline private documents upload" ON storage.objects;
CREATE POLICY "Topline private documents upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='private-documents' AND (private.current_user_has_permission('media','insert') OR EXISTS (SELECT 1 FROM public.customer_portal_access cpa WHERE cpa.auth_user_id=(select auth.uid()) AND split_part(name,'/',1)=cpa.customer_id::text)));
DROP POLICY IF EXISTS "Topline private documents update" ON storage.objects;
CREATE POLICY "Topline private documents update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='private-documents' AND (private.current_user_has_permission('media','update') OR EXISTS (SELECT 1 FROM public.customer_portal_access cpa WHERE cpa.auth_user_id=(select auth.uid()) AND split_part(name,'/',1)=cpa.customer_id::text))) WITH CHECK (bucket_id='private-documents');
DROP POLICY IF EXISTS "Topline private documents delete" ON storage.objects;
CREATE POLICY "Topline private documents delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='private-documents' AND (private.current_user_has_permission('media','delete') OR EXISTS (SELECT 1 FROM public.customer_portal_access cpa WHERE cpa.auth_user_id=(select auth.uid()) AND split_part(name,'/',1)=cpa.customer_id::text)));
