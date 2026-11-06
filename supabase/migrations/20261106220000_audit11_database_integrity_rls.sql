-- Phase 11: Database integrity and RLS hardening.
-- Keep private customer-document updates inside the authenticated customer's
-- own namespace while preserving staff media operations and project-document
-- isolation.

ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Topline private documents update" ON storage.objects;
CREATE POLICY "Topline private documents update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id='private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media','update')
      OR EXISTS (
        SELECT 1
        FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id=(SELECT auth.uid())
          AND split_part(name, '/', 1)=cpa.customer_id::text
      )
    )
  )
  WITH CHECK (
    bucket_id='private-documents'
    AND split_part(name, '/', 1) <> 'projects'
    AND (
      private.current_user_has_permission('media','update')
      OR EXISTS (
        SELECT 1
        FROM public.customer_portal_access cpa
        WHERE cpa.auth_user_id=(SELECT auth.uid())
          AND split_part(name, '/', 1)=cpa.customer_id::text
      )
    )
  );

COMMENT ON POLICY "Topline private documents update" ON storage.objects IS
  'Customer updates must keep the destination object in that customer namespace; staff media updates remain permission-gated and project paths remain excluded.';
