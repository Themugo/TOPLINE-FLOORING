-- Project document management on the EXISTING private-documents bucket.
-- Additive only: no new bucket, no change to existing storage policies.
-- Replaces the localStorage/sample-data ProjectDocumentManager with a
-- database-backed metadata table whose rows point at project-scoped storage
-- objects: projects/<project_id>/<uuid>-<sanitised filename>

CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 255),
  doc_type text NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('contract','site_survey','completion_certificate','safety_compliance','other')),
  storage_bucket text NOT NULL DEFAULT 'private-documents' CHECK (storage_bucket = 'private-documents'),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN (
    'application/pdf','image/jpeg','image/png','image/webp','text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Trust boundary: the object path must live under this row's own project.
  CONSTRAINT project_documents_path_scoped_chk
    CHECK (storage_path LIKE 'projects/' || project_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS project_documents_project_created_idx
  ON public.project_documents (project_id, created_at DESC);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_documents_staff_select ON public.project_documents;
CREATE POLICY project_documents_staff_select ON public.project_documents
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('projects','select'));

DROP POLICY IF EXISTS project_documents_staff_insert ON public.project_documents;
CREATE POLICY project_documents_staff_insert ON public.project_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    private.current_user_has_permission('projects','insert')
    AND uploaded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS project_documents_staff_update ON public.project_documents;
CREATE POLICY project_documents_staff_update ON public.project_documents
  FOR UPDATE TO authenticated
  USING (private.current_user_has_permission('projects','update'))
  WITH CHECK (private.current_user_has_permission('projects','update'));

DROP POLICY IF EXISTS project_documents_staff_delete ON public.project_documents;
CREATE POLICY project_documents_staff_delete ON public.project_documents
  FOR DELETE TO authenticated
  USING (private.current_user_has_permission('projects','delete'));

REVOKE ALL ON public.project_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;

-- Keep updated_at honest using the existing helper.
DROP TRIGGER IF EXISTS trg_project_documents_touch_updated_at ON public.project_documents;
CREATE TRIGGER trg_project_documents_touch_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

-- Auditability: same append-only activity_logs trigger used by other business tables.
DROP TRIGGER IF EXISTS trg_topline_audit_project_documents ON public.project_documents;
CREATE TRIGGER trg_topline_audit_project_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION private.audit_log_change();

-- Storage: additive policies scoped to the projects/ prefix of the existing
-- private-documents bucket, gated on the 'projects' permission. Existing
-- 'media'-permission and customer-portal policies are unchanged. Customer
-- portal users cannot match these paths (first segment is 'projects', not a
-- customer id), and anonymous access remains impossible (bucket is private).
DROP POLICY IF EXISTS "Topline project documents read" ON storage.objects;
CREATE POLICY "Topline project documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND private.current_user_has_permission('projects','select')
  );

DROP POLICY IF EXISTS "Topline project documents upload" ON storage.objects;
CREATE POLICY "Topline project documents upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND private.current_user_has_permission('projects','insert')
  );

DROP POLICY IF EXISTS "Topline project documents delete" ON storage.objects;
CREATE POLICY "Topline project documents delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND private.current_user_has_permission('projects','delete')
  );

COMMENT ON TABLE public.project_documents IS
  'Metadata for project documents stored in the private-documents bucket under projects/<project_id>/. Access is staff-permission gated; downloads use short-lived signed URLs.';
