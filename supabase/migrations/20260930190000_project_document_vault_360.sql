-- 360: Project document vault backed by private Supabase Storage.
-- Uses the existing private-documents bucket and staff RBAC/media boundary.

CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'other' CHECK (document_type IN ('contract','site_survey','completion_certificate','safety_compliance','other')),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  notes text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_documents_storage_path_matches_project CHECK (storage_path LIKE project_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project_created
  ON public.project_documents(project_id, created_at DESC);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_documents_staff_select ON public.project_documents;
CREATE POLICY project_documents_staff_select
  ON public.project_documents FOR SELECT TO authenticated
  USING (private.current_user_has_permission('projects','select'));

DROP POLICY IF EXISTS project_documents_staff_insert ON public.project_documents;
CREATE POLICY project_documents_staff_insert
  ON public.project_documents FOR INSERT TO authenticated
  WITH CHECK (private.current_user_has_permission('projects','insert'));

DROP POLICY IF EXISTS project_documents_staff_update ON public.project_documents;
CREATE POLICY project_documents_staff_update
  ON public.project_documents FOR UPDATE TO authenticated
  USING (private.current_user_has_permission('projects','update'))
  WITH CHECK (private.current_user_has_permission('projects','update'));

DROP POLICY IF EXISTS project_documents_staff_delete ON public.project_documents;
CREATE POLICY project_documents_staff_delete
  ON public.project_documents FOR DELETE TO authenticated
  USING (private.current_user_has_permission('projects','delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;

DROP TRIGGER IF EXISTS trg_topline_audit_project_documents ON public.project_documents;
CREATE TRIGGER trg_topline_audit_project_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION private.audit_log_change();

DROP TRIGGER IF EXISTS trg_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER trg_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The bucket already exists and is private. Keep its existing 10 MiB limit and MIME allowlist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-documents', 'private-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Topline project documents read" ON storage.objects;
CREATE POLICY "Topline project documents read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'private-documents' AND private.current_user_has_permission('projects','select'));

DROP POLICY IF EXISTS "Topline project documents upload" ON storage.objects;
CREATE POLICY "Topline project documents upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'private-documents' AND private.current_user_has_permission('projects','insert') AND split_part(name, '/', 1) IN (SELECT id::text FROM public.projects));

DROP POLICY IF EXISTS "Topline project documents update" ON storage.objects;
CREATE POLICY "Topline project documents update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'private-documents' AND private.current_user_has_permission('projects','update'))
  WITH CHECK (bucket_id = 'private-documents' AND private.current_user_has_permission('projects','update'));

DROP POLICY IF EXISTS "Topline project documents delete" ON storage.objects;
CREATE POLICY "Topline project documents delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'private-documents' AND private.current_user_has_permission('projects','delete'));

COMMENT ON TABLE public.project_documents IS 'Private project document metadata; file bytes live in the private-documents Supabase Storage bucket.';
COMMENT ON COLUMN public.project_documents.storage_path IS 'Private Storage object path in private-documents; first path segment is the project UUID.';
