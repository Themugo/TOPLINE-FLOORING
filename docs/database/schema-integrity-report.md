# Database Schema and Migration Integrity

**Assessment date:** 2026-11-02

## Source inventory

- Active migration files found: **127**.
- Unique 14-digit timestamp prefixes: **127**.
- The source contains a canonical schema and subsequent business-domain migrations.
- `src/types/database.ts` is present and the existing generated-types contract check passed within the aggregate verification suite.

## Service slug contract

The archive includes `20260930170000_service_catalog_and_communications_worker_hardening.sql`. It adds `public.services.slug`, backfills empty values, enforces `NOT NULL`, adds a unique index, and adds related service catalogue fields. This supports the application contract at source level.

The migration file's presence does **not** prove it has been applied to a remote Supabase project. The PostgREST `42703` report must be checked against the exact target project and schema cache before any migration or schema change is proposed.

## Safety

The local database validation script performs `supabase start`, `supabase db reset --local`, lint, SQL tests and generated type output. It now requires `TOPLINE_ALLOW_LOCAL_DB_RESET=true` before invoking any Supabase CLI command.

Do not set this variable unless the operator has confirmed that the local Supabase stack is disposable. Never use the local reset command against a linked or production database.

## Remaining verification

- Full disposable local migration replay.
- Database lint and SQL regression tests.
- RLS and grants verification against a running database.
- Staging schema and PostgREST cache verification.
- Generated types comparison after local replay.

No remote database was mutated or certified during this cycle.
