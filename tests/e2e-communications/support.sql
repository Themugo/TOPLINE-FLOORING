-- Makes the local test database behave like hosted Supabase for the PostgREST layer. Test database only.
ALTER ROLE authenticator WITH LOGIN PASSWORD 'pgrst_e2e_pw' NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO authenticator;
-- Hosted Supabase reads the JSON claims PostgREST sets as well as the legacy per-claim settings.
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true),''), (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'role'), 'anon') $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true),''), (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'sub'))::uuid $$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.email', true),''), (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'email')) $$;
