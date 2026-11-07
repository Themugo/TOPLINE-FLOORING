# G-02 — Disposable database migration replay execution report

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-PHASE-19-LEADS-REPAIRED-2026-11-07.zip`  
**Project root:** `TOPLINE-FLOORING-main/`  
**Scope:** Fresh disposable PostgreSQL 17 / local Supabase database; ordered replay of all active migrations; database lint; SQL regression tests; generated database types.

## Executive result

**G-02 status: OPEN — execution environment required.**

The project contains exactly **163 active SQL migrations**, from `20260910000000_topline_canonical_schema.sql` through `20261107210000_phase_19_order_confirmation_delivery_reliability.sql`. The migration filenames satisfy the 14-digit timestamp naming contract and the existing migration integrity, SQL runtime-safety, production database preflight and schema contract verifiers pass.

A real PostgreSQL/Supabase replay was **not executed in this audit container** because it has no Docker, PostgreSQL server/client binaries, `pg_ctl`, `initdb`, `psql` or Supabase CLI. The repository is therefore not being represented as replay-certified. Run the enhanced validator in GitHub Actions or on the user's machine with Docker Desktop running. The validator performs local-only operations and refuses to reset a database unless the explicit opt-in is set.

## Corrections in this phase

1. The GitHub Actions `Local Supabase replay` step now sets `TOPLINE_ALLOW_LOCAL_DB_RESET=true` only for that one step and sets `TOPLINE_EXPECTED_MIGRATION_COUNT=163`.
2. The CI workflow uploads replay logs and the migration manifest as a run artifact, even when the replay step fails.
3. `scripts/validate-local-supabase.mjs` now checks the expected migration count, filename contract and unique timestamps; creates a SHA-256 migration manifest; preflights the Docker daemon; runs `supabase start`, `supabase db reset --local`, `supabase db lint --local`, `supabase test db --local`, and `supabase gen types typescript --local`; and writes a machine-readable summary and log under `artifacts/database-replay/`.
4. All database commands are explicitly local. This phase does not link a Supabase project, run `db push`, or modify any remote database.

## Static verification performed in this environment

| Check | Result |
|---|---|
| Active migration inventory | 163 found |
| First/last migration boundaries | Passed |
| Migration integrity verifier | Passed |
| SQL runtime-safety verifier | Passed |
| Production DB preflight | Passed |
| Schema contract verifier | Passed (163 migrations) |
| Validator JavaScript syntax | Passed |
| CI YAML parse | Passed |
| Destructive reset opt-in guard | Passed (blocked with exit 2 when opt-in absent) |
| Docker daemon / PostgreSQL replay | Not available in this environment |

## Exact disposable replay commands

On Windows CMD, from the repository root, with Docker Desktop running and dependencies installed:

```cmd
set TOPLINE_ALLOW_LOCAL_DB_RESET=true
set TOPLINE_EXPECTED_MIGRATION_COUNT=163
npm run validate:local-db
```

The script runs a fresh local Supabase reset, which replays the active migrations in order, then database lint, all configured SQL tests and generated database type output. Review `artifacts\database-replay\database-replay.log`, `database-replay-summary.json` and `migration-manifest.sha256`.

Do not set this opt-in for a linked/production database. Do not run `supabase db push` as part of G-02.

## Closure criteria

G-02 may be marked **CLOSED** only when a run against a new disposable database proves all of the following:

- PostgreSQL major version is 17, consistent with `supabase/config.toml`.
- Exactly 163 migrations were discovered and replayed in order, with no failed migration.
- `supabase db lint --local` exits successfully.
- `supabase test db --local` exits successfully and all SQL regression tests pass.
- Local database type generation completes; any generated type diff is reviewed and reconciled.
- The replay log, migration manifest SHA-256, test output and exact commit SHA are retained as CI artifacts.

A static verifier pass, a successful `supabase start`, or an empty migration status alone is not sufficient evidence.
