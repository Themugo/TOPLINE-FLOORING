# G-21 — Deployment & Canonical Supabase Reconciliation Report
**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-20-WORKFLOW-REGISTER-DATABASE-COUNT-RECONCILIATION-2026-11-07.zip`  
**Foundation SHA-256:** `7e52947423304b18a0e38cb462d8461690d407ae095c38315cda344a7530362e`

## Executive result
**G-21 source/deployment documentation reconciliation completed; live release certification remains OPEN.** The audit found that `DEPLOYMENT.md` still described creating a new Supabase project and warned against using the current migration directory as a deployable sequence. That contradicted the repository's canonical project pin, current migration manifest and Operation 16 client-owned Supabase specification. The linked/local database runners and CI still defaulted to the historical 163-migration count while the current source contains 165.

## Findings and remediation
1. **Deployment guide described obsolete infrastructure.** Rewrote the guide around the canonical client-owned Topline project `cvjmfplhdlfvqnnmzqcp` and its configured URL. Clarified that source pinning does not prove remote history or schema state.
2. **Migration instructions contradicted the current manifest.** Replaced the old "create a new project / do not apply existing migrations" direction with the current immutable timestamped migration policy and source inventory checks.
3. **Runtime migration counts were stale.** Updated the local replay default, linked read-only certification default, CI replay environment and Windows CMD instructions from 163 to 165.
4. **Environment variable guidance was outdated.** The deployment guide now prefers `VITE_SUPABASE_PUBLISHABLE_KEY`, consistent with `.env.example`; the anon key is described only as a legacy compatibility fallback. Server-only secrets remain excluded from browser variables.
5. **Migration policy contained an obsolete project-state assertion.** Updated it to distinguish the repository's canonical project pin from unverified remote migration history.
6. **Historical G-03 report needed a current count qualification.** Preserved the historical 163-migration execution snapshot and appended an erratum explaining that current source contains 165 and new read-only runs must use 165.
7. **Added a G-21 regression gate.** New verifier checks canonical project identity, current migration count, local-reset guard, linked-read opt-in, dry-run-only remote validator, separate production approval and policy/document consistency. Registered package scripts and CI.

## Current source facts
- Canonical project ref: `cvjmfplhdlfvqnnmzqcp`.
- Canonical API URL: `https://cvjmfplhdlfvqnnmzqcp.supabase.co`.
- PostgreSQL major version in config: 17.
- Current active migration files: 165, with unique 14-digit timestamps.
- Environment example uses the canonical URL and publishable-key variable.

## Verification performed
- `node scripts/verify-g21-deployment-reconciliation.mjs` — PASS.
- `node scripts/verify-remote-deploy-gate.mjs` — PASS (165 migrations).
- `node scripts/verify-g03-linked-supabase.mjs` — PASS.
- `node scripts/verify-operation-16-client-owned-supabase.mjs` — PASS.
- `node scripts/verify-migration-integrity.mjs` — PASS.
- `node scripts/verify-database-dependencies.mjs` — PASS (165 migrations, 167 tables, 275 functions, 290 FK references).
- `node scripts/verify-g20-workflow-register-database-counts.mjs` — PASS.
- ZIP integrity test — PASS.

## Not performed / not certified
- No linked Supabase connection or remote catalog query was made.
- No remote migration history, linked dry-run or hosted database lint was run.
- No migration was applied; no production database, data, DNS, secrets or provider configuration was changed.
- Disposable local PostgreSQL replay was not run in this environment.
- Full frontend typecheck/build/browser suite was not run; the archive did not include `node_modules`.

## Closure criteria
1. Install dependencies and complete typecheck, lint and production build.
2. Run the guarded disposable local Supabase replay with expected migration count 165; review all SQL test, lint and generated type outputs.
3. After owner authorization, confirm the linked project identity and run read-only migration history, dry-run and linked lint.
4. Reconcile every local/remote migration difference; stop on unexplained pending/divergent migrations.
5. Obtain separate explicit approval before any production migration application or frontend deployment.
6. Complete staging/customer/admin/provider UAT and preserve tested release evidence.

**Disposition:** Source documentation, scripts and CI reconciled. Remote database state and production release remain unverified. No production deployment, database mutation, commit or push was performed.
