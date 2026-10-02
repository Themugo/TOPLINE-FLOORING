-- Security hardening: close legacy "public_read USING (true)" policies and stop exposing
-- internal project data to anonymous visitors and signed-in customers.
--
-- Root cause: the canonical schema created `public_read ... USING (true)` on the public
-- CMS/catalogue tables. The RBAC migration later added `rbac_public_read_<table>` with the
-- intended `is_active = true` restriction, but never dropped the legacy policy. Postgres
-- OR-combines permissive policies, so the restriction was void: anonymous visitors could read
-- inactive/draft services, products, projects, promotions, delivery zones and more.
--
-- Pre-conditions: every table below already has a restricted `rbac_public_read_*` policy, and
-- staff have `rbac_staff_read_all_*` (migration 20260930190000) so admin screens still see
-- inactive rows.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.policyname = 'public_read'
      AND EXISTS (
        SELECT 1 FROM pg_policies q
        WHERE q.schemaname = 'public'
          AND q.tablename = p.tablename
          AND q.cmd IN ('SELECT','ALL')
          AND q.policyname <> 'public_read'
          AND ('anon' = ANY(q.roles) OR 'public' = ANY(q.roles))
      )
  LOOP
    EXECUTE format('DROP POLICY public_read ON public.%I', r.tablename);
  END LOOP;
END $$;

-- Projects carry customer links and cost/margin data (customer_id, order_id, estimated_cost,
-- actual_cost, project_value, project_address, assigned_team, ...). Publish only a safe
-- projection through a view; the base table becomes staff-only.
CREATE OR REPLACE VIEW public.public_projects AS
SELECT
  id, title, slug, client_name, service_type, category, location,
  project_date, completion_date, area_size, description, challenge, solution, results,
  featured, display_order, created_at, updated_at
FROM public.projects
WHERE is_active = true;

ALTER VIEW public.public_projects OWNER TO postgres;
REVOKE ALL ON public.public_projects FROM PUBLIC;
GRANT SELECT ON public.public_projects TO anon, authenticated, service_role;

DROP POLICY IF EXISTS rbac_public_read_projects ON public.projects;
