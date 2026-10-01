# TOPLINE NEXT Audit / Build / Fix — 2026-10-01

## Baseline
Continued from `TOPLINE-FLOORING-NEXT-CATALOG-UPLOAD-HARDENED-2026-10-01`.

## Fixes
- Preserved the 95-migration database foundation.
- Added a read-only live catalog schema preflight command: `npm run verify:live-catalog-schema`.
- Hardened the services/installations E2E runner to convert a missing `services.slug` (`42703`) into an explicit migration-drift diagnosis instead of a generic HTTP failure.
- The E2E runner remains mutation-safe and does not weaken the canonical service schema contract.
- No database columns were removed and no legacy migration history was rewritten.

## Local structural verification
`npm run verify:all` => 96/96 passed, 0 failed.

## Current live-environment finding
The previously reported real Supabase run reached the canonical project but failed because the live `services` table did not contain `slug`. This is migration drift, not a reason to weaken the application contract.

Apply the migration chain to the intended non-production/staging database with `supabase db push`, then run:

- `npm run verify:live-catalog-schema`
- `npm run test:e2e:services-installation`
- `npm run db:types`
- `npm run typecheck`
- `npm run lint`
- `npm run build:all`

Do not use `supabase db reset --linked` against production.

## Not claimed
This package does not claim live database migration, live Storage authorization, authenticated installation lifecycle, or provider UAT until those commands have been run against the intended environment.
