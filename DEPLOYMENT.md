# Deployment Guide — Topline Flooring & Waterproofing

> **Infrastructure status:** the application source is ready for the dedicated Supabase infrastructure phase. The repository currently contains historical migrations that must be consolidated and verified before they are used to create the production database.

## 1. Build the application

Install dependencies and validate the source tree:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

The normal production build is `npm run build`. `npm run build:all` also generates the sitemap, but sitemap generation can operate without a database and will fall back to the static route set when Supabase is not configured.

## 2. Supabase infrastructure prerequisite

Create a **new, dedicated Supabase project for Topline Flooring & Waterproofing**. Do not reuse credentials or databases from another application.

The infrastructure phase must establish and verify:

- one canonical database baseline;
- deterministic migration order;
- Supabase Auth;
- staff identity/profile model;
- roles and permissions;
- RLS for every business table;
- storage buckets and storage policies;
- public quote/order intake RPCs;
- audit logging;
- production seed data; and
- backup/recovery expectations.

Until that work is complete, do not apply the existing `supabase/migrations/` directory blindly. It contains historical duplicate and overlapping migration generations.

## 3. Environment variables

Create a local `.env` from `.env.example`:

```text
VITE_SUPABASE_URL=https://<topline-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<topline-anon-key>
```

Optional:

```text
VITE_SITE_URL=https://<topline-production-domain>
VITE_LOGGING_API_ENDPOINT=https://<approved-observability-endpoint>
```

The browser only receives the Supabase URL and anon/public key. **Never** place a Supabase service-role key in `.env`, Vercel, client code, or Git.

## 4. Business portal authentication

The `/admin/*` portal uses Supabase Auth sessions. Create the initial owner/admin identity through the Supabase dashboard or the controlled developer bootstrap script after the infrastructure/RBAC phase is installed.

The repository contains no default admin password and the application does not authenticate using browser storage flags.

The existing `scripts/create-admin.mjs` is a developer-machine bootstrap utility. It requires a service-role key at invocation time and must never be shipped to the browser or used as an application login endpoint.

## 5. Vercel deployment

After the Supabase infrastructure is verified:

1. Import the GitHub repository into Vercel.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the appropriate environments.
3. Add `VITE_SITE_URL` with the canonical public Topline domain.
4. Deploy the Vite application.
5. Verify public pages, quote capture, checkout, order tracking and every protected portal route.
6. Verify RLS and storage policies using both anonymous and authenticated test sessions.

`vercel.json` contains the SPA routing configuration required for client-side Wouter routes.


## 5A. Phase 5 hosting and domain release contract

The canonical production website is `https://toplinefloorandwaterproofing.co.ke`. `www` is redirected to the canonical non-www host. `robots.txt` publishes the canonical sitemap and `/.well-known/security.txt` provides a security contact.

Run the static release gate before deployment:

```cmd
npm run verify:phase-5-hosting
```

Follow `docs/PHASE_5_PRODUCTION_HOSTING_DOMAIN_RELEASE.md` for the safe DNS/Vercel cutover sequence. Keep existing cPanel MX/mail records unchanged during the web migration.

## G-03 — Linked Supabase certification (read-only)

The repository is pinned to Topline project `cvjmfplhdlfvqnnmzqcp`. This phase verifies the linked target, compares local and remote migration history, previews pending migrations, and lints the linked database. It does **not** apply migrations or change remote schema/data.

From Windows CMD, after confirming you are authorised to inspect the intended Topline Supabase project:

```cmd
npx supabase login
npx supabase link --project-ref cvjmfplhdlfvqnnmzqcp
set TOPLINE_ALLOW_LINKED_DB_READS=true
set TOPLINE_EXPECTED_MIGRATION_COUNT=163
npm run validate:linked-supabase
```

The validator refuses to run unless the linked project reference exactly matches `supabase/config.toml`. It runs only:

- `supabase migration list --linked`
- `supabase db push --dry-run --linked`
- `supabase db lint --linked --fail-on error`

Evidence is written to `artifacts/linked-supabase-certification/`. Review the complete migration table and dry-run output for missing, extra, or pending versions; a successful CLI exit alone does not approve deployment. Do not run `db push` without `--dry-run`, `migration repair`, `migration up`, `db reset --linked`, or `config push` during G-03. Any actual migration application is a separate, explicitly approved release action after G-02 and G-03 are closed.

Never run `supabase db reset --linked` against the real Topline production project.

## 6. Operational rule

A successful frontend build does **not** prove that the database, RLS, authentication or business workflows are production-ready. Production sign-off requires the infrastructure and security verification described above.


## 7. Ecommerce stability foundation

Migration `20260911160000_048_ecommerce_stability_foundation.sql` adds the production commerce boundary:

- idempotent checkout;
- stock reservations;
- provider-neutral payment transactions;
- staff-only order status mutation;
- staff-only payment recording;
- human-readable order numbers.

Apply it only after the canonical schema and migrations 39–47 have been validated in a disposable/local database. Do not run `supabase db reset --linked` against the production project.

## 8. Legacy migration rule

WordPress remains online during ecommerce rollout. Product and service data should be imported only after client approval. Existing email, DNS and cPanel services are not prerequisites for the new database and should be migrated independently.

## Local database reset safety

The repository's local Supabase validation script performs a destructive reset of the **local** database before linting and running SQL tests. It now stops before invoking the Supabase CLI unless the operator explicitly sets:

```bash
TOPLINE_ALLOW_LOCAL_DB_RESET=true npm run validate:local-db
```

Only set this variable after confirming the local Supabase instance is disposable. This opt-in is not permission to reset, link, or mutate a remote or production database. Never run `supabase db reset --linked` against production.

