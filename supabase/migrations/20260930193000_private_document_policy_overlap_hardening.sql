-- 361: Harden private document storage policy overlap.
-- The earlier 097 policies granted broad media/customer access to the entire bucket.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- The bucket is currently used by the project document vault, so remove that overlap
-- and scope Storage access to rows represented in project_documents.

DROP POLICY IF EXISTS "Topline private documents read" ON storage.objects;
DROP POLICY IF EXISTS "Topline private documents upload" ON storage.objects;
DROP POLICY IF EXISTS "Topline private documents update" ON storage.objects;
DROP POLICY IF EXISTS "Topline private documents delete" ON storage.objects;

DROP POLICY IF EXISTS "Topline project documents read" ON storage.objects;
CREATE POLICY "Topline project documents read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND private.current_user_has_permission('projects','select')
    AND EXISTS (
      SELECT 1
      FROM public.project_documents pd
      WHERE pd.storage_path = storage.objects.name
    )
  );

DROP POLICY IF EXISTS "Topline project documents upload" ON storage.objects;
CREATE POLICY "Topline project documents upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-documents'
    AND private.current_user_has_permission('projects','insert')
    AND split_part(name, '/', 1) IN (SELECT id::text FROM public.projects)
  );

DROP POLICY IF EXISTS "Topline project documents update" ON storage.objects;
CREATE POLICY "Topline project documents update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND private.current_user_has_permission('projects','update')
    AND EXISTS (
      SELECT 1
      FROM public.project_documents pd
      WHERE pd.storage_path = storage.objects.name
    )
  )
  WITH CHECK (
    bucket_id = 'private-documents'
    AND private.current_user_has_permission('projects','update')
    AND split_part(name, '/', 1) IN (SELECT id::text FROM public.projects)
  );

DROP POLICY IF EXISTS "Topline project documents delete" ON storage.objects;
CREATE POLICY "Topline project documents delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND private.current_user_has_permission('projects','delete')
    AND EXISTS (
      SELECT 1
      FROM public.project_documents pd
      WHERE pd.storage_path = storage.objects.name
    )
  );

COMMENT ON POLICY "Topline project documents read" ON storage.objects IS
  'Project document access is granted only for metadata rows in project_documents; older broad media/customer policies are intentionally removed.';
