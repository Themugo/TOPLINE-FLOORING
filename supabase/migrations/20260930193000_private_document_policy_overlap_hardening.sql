-- Private document storage: one coherent policy set for the single `private-documents` bucket.
--
-- Two kinds of object live in the bucket, separated by the first path segment:
--   projects/<project_id>/<uuid>-<file>   project documents (metadata in public.project_documents)
--   <customer_id>/...                     customer-owned documents and staff media (migration 097)
--
-- Problem solved: the 097 media/customer policies covered the WHOLE bucket, so any staff member with
-- the `media` permission could read, overwrite or delete every project document regardless of the
-- `projects` permission. The 097 policies are therefore re-created for every path EXCEPT the
-- `projects/` namespace, and project documents get their own stricter policies. Customer and media
-- behaviour outside the project namespace is unchanged.
--
-- Idempotent: every statement is DROP POLICY IF EXISTS + CREATE POLICY.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Customer documents and staff media: everything outside projects/
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Topline private documents read" ON storage.objects;
CREATE POLICY "Topline private documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media', 'select')
      OR EXISTS (
        SELECT 1 FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id = (SELECT auth.uid())
          AND split_part(name, '/', 1) = cpa.customer_id::text
      )
    )
  );

DROP POLICY IF EXISTS "Topline private documents upload" ON storage.objects;
CREATE POLICY "Topline private documents upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media', 'insert')
      OR EXISTS (
        SELECT 1 FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id = (SELECT auth.uid())
          AND split_part(name, '/', 1) = cpa.customer_id::text
      )
    )
  );

DROP POLICY IF EXISTS "Topline private documents update" ON storage.objects;
CREATE POLICY "Topline private documents update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media', 'update')
      OR EXISTS (
        SELECT 1 FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id = (SELECT auth.uid())
          AND split_part(name, '/', 1) = cpa.customer_id::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) <> 'projects'
  );

DROP POLICY IF EXISTS "Topline private documents delete" ON storage.objects;
CREATE POLICY "Topline private documents delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media', 'delete')
      OR EXISTS (
        SELECT 1 FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id = (SELECT auth.uid())
          AND split_part(name, '/', 1) = cpa.customer_id::text
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Project documents: projects/<project_id>/...
-- ---------------------------------------------------------------------------
-- Read: any staff member holding projects.select (the same permission that already lets them read every
-- project_documents row). Deliberately NOT conditional on a metadata row: the app uploads the file first
-- and registers the metadata second, and Storage evaluates the SELECT policy on the freshly inserted row
-- (INSERT ... RETURNING), so requiring the metadata row would reject every upload.
DROP POLICY IF EXISTS "Topline project documents read" ON storage.objects;
CREATE POLICY "Topline project documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND private.current_user_has_permission('projects', 'select')
  );

-- Upload only into the folder of a project that exists.
DROP POLICY IF EXISTS "Topline project documents upload" ON storage.objects;
CREATE POLICY "Topline project documents upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND private.current_user_has_permission('projects', 'insert')
    AND split_part(name, '/', 2) IN (SELECT id::text FROM public.projects)
  );

DROP POLICY IF EXISTS "Topline project documents update" ON storage.objects;
CREATE POLICY "Topline project documents update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND private.current_user_has_permission('projects', 'update')
    AND EXISTS (SELECT 1 FROM public.project_documents pd WHERE pd.storage_path = storage.objects.name)
  )
  WITH CHECK (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND split_part(name, '/', 2) IN (SELECT id::text FROM public.projects)
  );

-- Delete a registered document with the projects.delete permission. The uploader may also remove
-- their own still-unregistered upload, which is how the app rolls back when saving metadata fails.
DROP POLICY IF EXISTS "Topline project documents delete" ON storage.objects;
CREATE POLICY "Topline project documents delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND (
      (
        private.current_user_has_permission('projects', 'delete')
        AND EXISTS (SELECT 1 FROM public.project_documents pd WHERE pd.storage_path = storage.objects.name)
      )
      OR (
        owner = (SELECT auth.uid())
        AND private.current_user_has_permission('projects', 'insert')
        AND NOT EXISTS (SELECT 1 FROM public.project_documents pd WHERE pd.storage_path = storage.objects.name)
      )
    )
  );

COMMENT ON POLICY "Topline project documents read" ON storage.objects IS
  'Project documents are readable only by staff holding projects.select. The broader media/customer policies exclude the projects/ namespace, so media-only staff and customers cannot read them.';
