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

## 6. Operational rule

A successful frontend build does **not** prove that the database, RLS, authentication or business workflows are production-ready. Production sign-off requires the infrastructure and security verification described above.
