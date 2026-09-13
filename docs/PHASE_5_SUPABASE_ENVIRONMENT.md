# Phase 5 — Topline Supabase Environment Activation

## Objective

Bind the application and Supabase CLI structure to the known dedicated Topline project without prematurely changing the remote database.

## Target

- Organization: Frameworks Suites
- Project: Topline Flooring & Water Roofing
- Project ref: `zmbsskvnzjdaxuxlauyx`
- API URL: `https://zmbsskvnzjdaxuxlauyx.supabase.co`

## Delivered

- Added `supabase/config.toml` with the authoritative Topline project reference.
- Bound `.env.example` to the correct Topline API URL.
- Standardized browser configuration around the Supabase publishable key.
- Preserved the legacy anon-key fallback for compatibility.
- Added a safe remote activation/reconciliation workflow to the Supabase documentation.
- Kept remote DDL/data changes out of this phase because the live project could not be inspected through the ChatGPT Supabase connection.
- Established the exact CLI commands for migration inspection, dry-run and eventual deployment.
- Established authoritative TypeScript type generation from the linked remote project as the next database step.

## Safety boundary

Phase 5 does **not** assume that the remote database is empty or matches the repository. The first remote operation must be migration-history/schema inspection. Only after reconciliation should `db push --linked` be used.

## Verification sequence

```cmd
npx supabase login
npx supabase link --project-ref zmbsskvnzjdaxuxlauyx
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db lint --linked
npx supabase gen types typescript --linked > src/types/database.ts
```

`db push --linked` is deliberately excluded from the default Phase 5 workflow until the remote migration history has been reviewed.
