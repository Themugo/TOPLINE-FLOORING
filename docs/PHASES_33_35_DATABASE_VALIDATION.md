# Phases 33–35 — Database Validation & Production Readiness 360

## Phase 33 — Local PostgreSQL validation

`validate-local-supabase.mjs` provides the controlled path for running the complete active migration chain against the local Supabase/PostgreSQL stack. It performs local start, reset, lint, DB regression tests and TypeScript generation. It never targets the remote project.

Run from the project root:

```cmd
npm run validate:local-db
```

If Docker/Supabase CLI is unavailable, the script reports that fact rather than pretending validation succeeded.

## Phase 34 — Schema/type contract

`verify-schema-contract.mjs` checks the canonical ten-migration chain, ordering, destructive schema operations and explicit `search_path` on SECURITY DEFINER PL/pgSQL functions.

Run:

```cmd
npm run verify:schema-contract
```

Generated `src/types/database.ts` must only be refreshed from a successfully validated local or explicitly linked database; the repository does not fabricate generated types.

## Phase 35 — Production readiness gate

`production-readiness-gate.mjs` verifies the environment contract and scans production-facing code for known legacy credentials/project identifiers/placeholders.

Run:

```cmd
npm run verify:production-readiness
```

Remote activation remains a separate, deliberate operation:

```cmd
npx supabase link --project-ref zmbsskvnzjdaxuxlauyx
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Do not run `db reset --linked` against the real Topline project.


## Phase 33–35 hardening delivered

The production gate now enforces the current 40-migration chain, unique and strictly increasing migration timestamps, required late-stage canonical migrations, explicit `search_path` on SECURITY DEFINER PL/pgSQL functions, required production RPC presence, the dedicated Topline project reference, and protection against server-only service-role credentials entering the client environment contract.

`npm run verify:production-db-preflight` provides the additional CI preflight for migration naming, project binding, credential exposure, and CI coverage.

This initiative deliberately does **not** claim that the remote database has been migrated. Remote execution remains an explicit operator action after local validation and dry-run review.

## Current repository baseline

The current production migration chain contains **40 active migrations**. The Phase 33–35 static inventory currently resolves **107 tables and 119 functions**. These numbers are repository-derived and are not a claim about the state of the remote Supabase project until migrations are actually applied there.

### CI enforcement

CI now executes both:

```text
npm run verify:phases-33-35
npm run verify:production-db-preflight
```

The preflight is intentionally read-only and does not link, reset, push, or mutate a remote database.
