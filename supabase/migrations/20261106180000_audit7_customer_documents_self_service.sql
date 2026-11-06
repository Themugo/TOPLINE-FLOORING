-- Phase 7: customer documents and self-service download boundary.
-- The portal already exposes metadata through get_customer_portal_documents().
-- Binary access is intentionally handled by the authenticated customer-document-download Edge Function,
-- which resolves the auth_user_id -> customer_id mapping and returns a five-minute signed URL only after
-- an exact customer_documents ownership check. Legacy file_url values are accepted only when they are
-- private-documents object paths in the owning customer's <customer_id>/ namespace.

COMMENT ON FUNCTION public.get_customer_portal_documents() IS
  'Customer-bound document metadata view; file URLs are intentionally excluded. Authenticated downloads use the customer-document-download function and short-lived signed URLs.';
