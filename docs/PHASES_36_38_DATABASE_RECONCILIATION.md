# Phases 36–38 — Database Reconciliation & Deployment Safety 360

This initiative hardens the boundary between the canonical migration chain, generated application types, local PostgreSQL replay and the dedicated production Supabase project.

## Phase 36 — Local database replay contract

`npm run validate:local-db` is the only automated path for destructive database reset. It is explicitly scoped to the local Supabase stack and performs:

1. migration ordering validation;
2. local Supabase start;
3. local-only database reset;
4. local database lint;
5. database regression tests;
6. local TypeScript type generation.

If Docker or the Supabase CLI is unavailable, the command fails rather than claiming that the database was validated.

## Phase 37 — Dependency + generated type contract

`npm run verify:database-dependencies` validates that every public foreign-key target exists in the same or an earlier migration and checks the canonical application RPC surface, including the late-stage reporting, finance, communications, inventory and field-operations contracts.

`npm run db:types` generates `src/types/database.ts` from the **local** validated database:

```cmd
npx supabase gen types typescript --local > src/types/database.ts
```

`npm run verify:generated-types` rejects malformed, suspiciously small or credential-contaminated generated artifacts. CI requires the generated artifact after local replay.

## Phase 38 — Remote deployment safety contract

`npm run verify:remote-deploy-gate` verifies:

- dedicated Topline project binding (`zmbsskvnzjdaxuxlauyx`);
- exact production URL contract;
- 84 active migrations;
- unique, strictly formatted migration timestamps;
- no destructive `DROP SCHEMA public` in active migrations;
- no service-role credential identifiers or historical plaintext credentials in active migrations;
- no executable tooling containing `supabase db reset --linked`;
- deployment documentation includes the linked dry-run gate.

The gate never connects to, resets, pushes to or mutates the remote database.

## Safe remote sequence

After local replay, regression tests and type generation succeed:

```cmd
npx supabase login
npx supabase link --project-ref zmbsskvnzjdaxuxlauyx
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db lint --linked
```

Review the dry-run and linked migration history before any real `db push`.

**Never run `supabase db reset --linked` against the real Topline production project.**

## Current repository baseline

The canonical repository currently contains **84 active migrations**, with a static inventory of **142 tables and 214 functions**. These figures describe the repository migration chain, not the live remote database.

The late-stage canonical migrations are:

- `20260912170000_066_sales_project_lifecycle_360_hardening.sql`
- `20260912180000_067_communications_provider_response_360.sql`
- `20260912190000_068_finance_communications_analytics_360_hardening.sql`
- `20260912200000_069_reporting_operational_intelligence_360.sql`

## CI enforcement

CI runs the local replay and then enforces:

```text
npm run verify:phases-36-38
npm run verify:database-dependencies
npm run verify:generated-types
npm run verify:remote-deploy-gate
```

No CI step is authorized to reset or push the linked production database.
