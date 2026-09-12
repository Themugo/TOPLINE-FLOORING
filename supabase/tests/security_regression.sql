-- Topline security regression cases.
-- Run against a disposable/local Supabase database after migrations are applied.
-- These assertions intentionally fail loudly if sensitive business data is exposed.

DO $$
DECLARE
  protected_tables text[] := ARRAY[
    'staff_profiles','staff_role_assignments','customers','orders','order_items',
    'invoices','payments','communication_outbox','customer_communications'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY protected_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION '% must have RLS enabled', t;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND roles @> ARRAY['anon']::name[]
      AND tablename = ANY(protected_tables)
  ) THEN
    RAISE EXCEPTION 'Sensitive tables must not expose anon policies';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'anon'
      AND table_schema = 'public'
      AND table_name = ANY(protected_tables)
      AND privilege_type IN ('INSERT','UPDATE','DELETE')
  ) THEN
    RAISE EXCEPTION 'Anon must not have write privileges on sensitive tables';
  END IF;
END $$;
