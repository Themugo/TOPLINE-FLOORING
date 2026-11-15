# Deployment Guide — Topline Flooring & Waterproofing

> **Canonical infrastructure:** this repository is pinned to the dedicated client-owned Topline Supabase project `cvjmfplhdlfvqnnmzqcp` (`https://cvjmfplhdlfvqnnmzqcp.supabase.co`). This guide describes the current source configuration and safe release sequence. It does not claim that the remote migration history, current schema, provider settings or production deployment have been verified.

## 1. Build and source validation

Use Node.js 22.x as declared in `package.json`. From the repository root:

```cmd
npm ci
npm run typecheck
npm run lint
npm run build
npm run verify:remote-deploy-gate
npm run verify:operation-16-client-owned-supabase
```

Run the project's focused and aggregate test commands as defined in `package.json` and CI. A successful build or source verifier is not a substitute for database replay, staging UAT or production sign-off.

## 2. Canonical Supabase project and migration policy

- Project ref: `cvjmfplhdlfvqnnmzqcp`
- API URL: `https://cvjmfplhdlfvqnnmzqcp.supabase.co`
- Region recorded in the infrastructure specification: `eu-central-1`
- PostgreSQL major version configured in `supabase/config.toml`: `17`
- Ownership: client-owned Topline project

Do not create or substitute another project as part of routine deployment, and never reuse another application's Supabase project. `supabase/config.toml`, `.env.example` and the frontend Supabase client pin the canonical identity.

The deployable migration sequence is the uniquely timestamped SQL files in `supabase/migrations/`. At this source snapshot it contains **172 active migrations**. Confirm the current count with:

```cmd
node scripts/verify-migration-integrity.mjs
node scripts/verify-database-dependencies.mjs
```

The count is repository-source inventory, not proof that all migrations have been applied remotely. See `supabase/MIGRATION_MANIFEST.md` and `supabase/MIGRATION_POLICY.md` for the authoritative sequence and immutable-history rules. Do not delete, renumber, rewrite, squash or manually apply migration history to make local and remote lists appear aligned.

## 3. Environment variables

Copy `.env.example` to `.env.local` for local development and supply the public publishable key from the dedicated Topline project:

```cmd
copy .env.example .env.local
```

Required browser-safe values:

```text
VITE_SUPABASE_URL=https://cvjmfplhdlfvqnnmzqcp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<Topline-publishable-key>
```

`VITE_SUPABASE_ANON_KEY` is retained only as a legacy compatibility fallback where required. Optional `VITE_SITE_URL` should use `https://toplinefloorandwaterproofing.co.ke`.

Never put a service-role key, database password, provider secret, SMTP credential or payment private key in a `VITE_*` variable, `.env.example`, browser code or Git. Server-only secrets belong in the appropriate server/Edge Function secret store.

## 4. Business portal authentication

The `/admin/*` portal uses Supabase Auth sessions. Create the initial owner/admin identity through the Supabase dashboard or the controlled developer bootstrap script after the infrastructure/RBAC phase is installed.

The repository contains no default admin password and the application does not authenticate using browser storage flags.

The existing `scripts/create-admin.mjs` is a developer-machine bootstrap utility. It requires a service-role key at invocation time and must never be shipped to the browser or used as an application login endpoint.

## 5. Vercel deployment

After the Supabase infrastructure is verified:

1. Import the GitHub repository into Vercel.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the appropriate Vercel environments (legacy anon-key fallback only where required).
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
set TOPLINE_EXPECTED_MIGRATION_COUNT=172
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


## G-21 — Release order and evidence boundary

The safe order is:

1. Complete source checks, dependency installation, typecheck, lint and frontend build.
2. Run the disposable/local Supabase replay only against a confirmed disposable local stack. The reset is local-only and guarded by `TOPLINE_ALLOW_LOCAL_DB_RESET=true`.
3. Review local replay, SQL tests, lint output and generated type changes.
4. Obtain explicit owner authorization before linked Supabase reads. Set `TOPLINE_ALLOW_LINKED_DB_READS=true` only after confirming the local CLI link identifies `cvjmfplhdlfvqnnmzqcp`; then run `npm run validate:linked-supabase`.
5. Manually reconcile the complete remote migration history and dry-run output. Stop on unexplained pending/divergent migrations or lint errors.
6. Apply migrations only under a separate explicit release approval, after the preceding gates are accepted. This guide and its verification scripts do not authorize production mutation.
7. Deploy the frontend only after approved infrastructure and environment checks; complete browser, role, payment and communications UAT before production sign-off.

**Never run** `supabase db reset --linked` against the client-owned production project. A linked `db push --dry-run --linked` is a preview, not a migration application and not proof that SQL executes successfully.

At the G-21 source snapshot, the canonical target is configured but linked project identity, remote migration history, remote schema, database lint, deployment state and provider readiness remain unverified in this execution environment.
