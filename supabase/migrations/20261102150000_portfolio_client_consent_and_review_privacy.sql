-- Production privacy hardening. Additive and backward compatible.
--
-- 1. Portfolio client names. public_projects previously published projects.client_name for every
--    project with is_active = true, and is_active defaults to true. A real customer job could therefore
--    expose that customer's name on the public portfolio without any explicit consent. Publishing the
--    client name is now an explicit, separate, default-off decision per project.
-- 2. Anonymous review reads no longer expose the internal customer_id UUID.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS show_client_name boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.show_client_name IS
  'Explicit consent flag. When false, projects.client_name is withheld from the public_projects view.';

CREATE OR REPLACE VIEW public.public_projects
WITH (security_barrier = true) AS
SELECT
  id,
  title,
  slug,
  CASE WHEN show_client_name THEN client_name ELSE NULL END AS client_name,
  service_type,
  category,
  location,
  project_date,
  completion_date,
  area_size,
  description,
  challenge,
  solution,
  results,
  featured,
  display_order,
  created_at,
  updated_at,
  materials_used
FROM public.projects
WHERE is_active = true;

GRANT SELECT ON public.public_projects TO anon, authenticated;

-- Column-level grant for anonymous review reads (customer_id intentionally omitted).
REVOKE SELECT ON public.product_reviews FROM anon;
GRANT SELECT (
  id, product_id, customer_name, rating, title, content, pros, cons,
  verified_purchase, helpful_votes, is_approved, admin_reply, admin_reply_at, created_at, updated_at
) ON public.product_reviews TO anon;
