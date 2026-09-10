# Phases 33–35 — Database Validation & Production Readiness

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
npx supabase link --project-ref jypkhvknfgoqrhwzbdwi
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Do not run `db reset --linked` against the real Topline project.
