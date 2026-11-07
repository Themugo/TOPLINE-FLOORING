-- Phase 7: customer self-service access to project documents and Storage path integrity.
-- Reuses the canonical project_documents table and existing private-documents bucket.

-- RLS was enabled by the canonical vault migration; re-assert it for this additive policy migration.
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS-safe ownership predicate: this helper reads the project owner under a fixed,
-- privileged context so the policy does not depend on customers having direct projects-table access.
CREATE OR REPLACE FUNCTION private.customer_owns_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.customer_id = public.get_current_customer_id()
  );
$$;
REVOKE ALL ON FUNCTION private.customer_owns_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.customer_owns_project(uuid) TO authenticated;

-- Customer metadata visibility is limited to projects owned by the authenticated portal customer.
DROP POLICY IF EXISTS project_documents_customer_select ON public.project_documents;
CREATE POLICY project_documents_customer_select ON public.project_documents
  FOR SELECT TO authenticated
  USING (private.customer_owns_project(project_id));

-- The storage object must have a registered metadata row for a customer to read it.
-- Staff access remains governed by the existing projects.select permission policy.
DROP POLICY IF EXISTS "Topline project documents read" ON storage.objects;
CREATE POLICY "Topline project documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) = 'projects'
    AND (
      private.current_user_has_permission('projects', 'select')
      OR EXISTS (
        SELECT 1
        FROM public.project_documents pd
        WHERE pd.storage_path = storage.objects.name
      )
    )
  );

-- Fix the customer-object UPDATE policy: USING checked ownership, but the former WITH CHECK
-- only checked the bucket/prefix, allowing an owned object to be renamed into another customer's
-- folder. Require the destination path to remain owned unless the actor has media.update.
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
          AND cpa.is_active = true
          AND split_part(name, '/', 1) = cpa.customer_id::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media', 'update')
      OR EXISTS (
        SELECT 1 FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id = (SELECT auth.uid())
          AND cpa.is_active = true
          AND split_part(name, '/', 1) = cpa.customer_id::text
      )
    )
  );

-- Return only customer-owned project document metadata and the private object path needed to
-- request a short-lived signed URL. No public URL, customer ID, or staff identity is exposed.
CREATE OR REPLACE FUNCTION public.get_customer_project_documents()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid := public.get_current_customer_id();
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', pd.id,
      'project_id', pd.project_id,
      'project_title', p.title,
      'file_name', pd.file_name,
      'doc_type', pd.doc_type,
      'mime_type', pd.mime_type,
      'file_size_bytes', pd.file_size_bytes,
      'created_at', pd.created_at,
      'storage_path', pd.storage_path
    ) ORDER BY pd.created_at DESC)
    FROM public.project_documents pd
    JOIN public.projects p ON p.id = pd.project_id
    WHERE p.customer_id = v_customer_id
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_project_documents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_project_documents() TO authenticated;
COMMENT ON FUNCTION public.get_customer_project_documents() IS
  'Returns project document metadata and private storage paths only for the authenticated customer; downloads require Storage RLS and short-lived signed URLs.';
