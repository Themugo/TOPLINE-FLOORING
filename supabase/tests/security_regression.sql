-- Topline security regression cases.
-- Run against a disposable/local Supabase database after migrations are applied.
-- These are intentionally written as psql assertions so they fail loudly.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'staff_profiles' AND relrowsecurity) THEN
    RAISE EXCEPTION 'staff_profiles must have RLS enabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'customers' AND relrowsecurity) THEN
    RAISE EXCEPTION 'customers must have RLS enabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'orders' AND relrowsecurity) THEN
    RAISE EXCEPTION 'orders must have RLS enabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'communication_outbox' AND relrowsecurity) THEN
    RAISE EXCEPTION 'communication_outbox must have RLS enabled';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND roles @> ARRAY['anon']::name[]
      AND tablename IN ('customers','orders','order_items','invoices','payments','communication_outbox','staff_profiles','staff_role_assignments')
  ) THEN
    RAISE EXCEPTION 'Sensitive tables must not expose anon policies';
  END IF;
END $$;
