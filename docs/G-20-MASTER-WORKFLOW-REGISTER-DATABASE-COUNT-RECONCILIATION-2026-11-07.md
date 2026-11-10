# G-20 — Master Workflow Register Database Count Reconciliation
**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-19-HSE-SITE-SAFETY-CERTIFICATION-2026-11-07.zip`  
**Foundation SHA-256:** `ca59a00151b7a3b06ec84d583336046e73109d051fa721b99ead8bfb813cfc40`

## Executive result
**G-20 source/documentation reconciliation completed.** The WF-12 Database/Supabase/RLS/data-integrity entry in `docs/MASTER-WORKFLOW-REGISTER.json` contained stale counts: 158 migrations, 167 tables, 274 functions and 290 foreign-key references. The current repository source verifier reports 165 migrations, 167 tables, 275 functions and 290 foreign-key references.

## Changes
1. Updated WF-12 entry points from 158 to 165 active SQL migrations.
2. Updated the function count from 274 to 275; retained 167 tables and 290 FK references because the current verifier still reports those values.
3. Rewrote WF-12 status to state the current source-derived counts and preserve the outstanding disposable/staging PostgreSQL replay and RLS role-matrix gates.
4. Added a structured `database_inventory` block with measurement date, source verifier, counts, scope qualification and runtime status.
5. Added `scripts/verify-g20-workflow-register-database-counts.mjs`, package scripts `verify:g20-workflow-register` and `test:g20-workflow-register`, and a CI verification step.

## Current source-derived inventory
| Measure | Current count |
|---|---:|
| Active SQL migration files | 165 |
| Unique migration timestamps | 165 |
| Tables defined in migration source | 167 |
| Functions defined in migration source | 275 |
| Foreign-key references in migration source | 290 |

These are repository-source counts from `scripts/verify-database-dependencies.mjs`. They are **not** a live Supabase catalog snapshot and do not prove the migrations have been applied remotely.

## Verification performed
- `node scripts/verify-g20-workflow-register-database-counts.mjs` — PASS.
- `node scripts/verify-database-dependencies.mjs` — PASS (165 migrations, 167 tables, 275 functions, 290 FK references).
- `node scripts/verify-g19-hse-certification.mjs` — PASS.
- WF-12 obsolete count strings checked and removed.
- Current migration manifest count and latest migration pointer checked.
- ZIP integrity test — PASS.

## Not performed / outstanding
- No PostgreSQL/Supabase migration replay was performed.
- No linked Supabase project was queried; live table/function/FK counts are unknown.
- No migration was applied, and no production database or data was modified.
- Full frontend build/browser suite was not run; the foundation archive does not contain `node_modules`.

## Acceptance to close G-20
1. Confirm the source-derived counts in CI using the new verifier.
2. When an authorized disposable/local PostgreSQL environment is available, replay the migration chain and compare actual catalog counts with source-derived counts.
3. Only after separate owner authorization, compare the linked project's migration history and catalog counts using read-only inspection; do not push migrations as part of G-20.
4. Update the register with live catalog counts only when actual catalog evidence exists, keeping source and remote values distinct.

**Disposition:** Documentation and source-count governance reconciled; G-20 source scope complete. Live catalog reconciliation remains pending and must not be represented as complete.
