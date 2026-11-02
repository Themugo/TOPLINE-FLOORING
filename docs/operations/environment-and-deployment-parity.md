# Environment and Deployment Parity

**Assessment date:** 2026-11-02

## Browser-safe configuration

The repository `.env.example` documents:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SITE_URL`
- optional `VITE_LOGGING_API_ENDPOINT`

Provider credentials, service-role keys, webhook secrets and worker secrets must remain in the appropriate Supabase Edge Function secret store or server-side environment. Do not place them in Vite-exposed variables.

## Hosting

The repository includes Vercel configuration and static verification for the Vite build, SPA routing, canonical host, security headers, robots and security contact. Static configuration checks do not prove that a Vercel project is connected, DNS is correct or a deployment is healthy.

## Safe release sequence

1. Restore a reproducible dependency installation from `package-lock.json`.
2. Run typecheck, lint, tests and production build.
3. Validate migrations in disposable local Supabase.
4. Confirm staging project identity and schema.
5. Configure staging Edge Function secrets and scheduled workers.
6. Verify authentication redirects, storage policies and RLS with test identities.
7. Complete provider sandbox and Brevo delivery acceptance.
8. Run browser acceptance at desktop, tablet and mobile widths.
9. Obtain client approval before production deployment or migration.

No deployment, DNS change, linked migration, production secret rotation or production mutation was performed.
