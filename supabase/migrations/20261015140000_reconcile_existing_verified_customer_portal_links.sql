-- Safely reconcile existing verified customer identities that predate the portal-link trigger.
-- Never link an unverified user, ambiguous email, or identity/customer already mapped elsewhere.
WITH unique_customer_emails AS (
  SELECT lower(trim(c.email)) AS normalized_email, (array_agg(c.id))[1] AS customer_id
  FROM public.customers c
  WHERE c.email IS NOT NULL AND trim(c.email) <> ''
  GROUP BY lower(trim(c.email))
  HAVING count(*) = 1
), eligible_links AS (
  SELECT u.id AS auth_user_id, m.customer_id
  FROM auth.users u
  JOIN unique_customer_emails m ON m.normalized_email = lower(trim(u.email))
  WHERE u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.customer_portal_access existing
      WHERE existing.auth_user_id = u.id OR existing.customer_id = m.customer_id
    )
)
INSERT INTO public.customer_portal_access (customer_id, auth_user_id, is_active, last_login)
SELECT customer_id, auth_user_id, true, now()
FROM eligible_links
ON CONFLICT DO NOTHING;
