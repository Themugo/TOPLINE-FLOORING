# G-19 HSE Certification — Remediation Addendum

**Date:** 2026-11-10  
**Foundation:** `TOPLINE-FLOORING-FINAL-CONSOLIDATED-G13-RELEASE-2026-11-07.zip`  
**Scope:** HSE site readiness, event lifecycle, corrective-action accountability and independent verification.

## Executive result

**G-19 source-level remediation is extended and verified. G-19 remains OPEN pending staging database execution and competent real-site HSE evidence.** The existing Operation 15 HSE module was retained; no redesign or replacement was performed.

## Defects found and corrected

1. **Resolved events could not be closed.** The prior terminal-state check treated `resolved` as fully terminal, while the admin UI correctly offered `resolved → closed`. The follow-up migration now permits only the sequential `open → investigating → controlled → resolved → closed` path and keeps `closed` terminal.
2. **Event state could be skipped.** Previously an authorized caller could jump directly from `open` to `closed` if no corrective actions existed. The RPC now rejects non-sequential transitions; same-state requests remain idempotent.
3. **Corrective-action verification was not independent.** The earlier function recorded `verified_by` but did not ensure the verifier differed from the assigned owner. Verification now requires an assigned owner and rejects self-verification.
4. **Corrective-action status transitions could be skipped.** The RPC now enforces `open → in_progress → blocked/completed → in_progress/verified → closed`, with `closed` terminal. Verification notes remain mandatory.
5. **Actions could be created without an accountable owner or due date, including after event resolution.** The creation RPC now requires both, locks the parent event, and rejects action creation after resolution.
6. **Event closure could occur while an action was merely verified.** Closure now requires every linked action to be `closed`, not merely `verified`.
7. **Site readiness could be created without a named responsible safety owner, explicit PPE applicability, emergency arrangements or a future review date.** The site-control RPC now requires all four. The admin create flow collects the corresponding values.
8. **The admin UI allowed an empty PPE entry and optional action owner.** Both are now required in the UI; a documented reason why PPE is not applicable can be entered instead of leaving the field blank. Resolved events no longer offer the Add action control.

## Files changed

- `supabase/migrations/20261110130000_g19_hse_transition_and_independent_verification.sql` — additive RPC hardening.
- `src/pages/admin/hse-site-compliance-360.tsx` — required owner/PPE capture and resolved-event affordance correction.
- `scripts/verify-g19-hse-lifecycle-integrity.mjs` — new regression contract.
- `scripts/verify-g19-hse-certification.mjs` and existing HSE verifier remain in place.
- `package.json`, `.github/workflows/ci.yml` — dedicated G-19 lifecycle gate.
- `supabase/MIGRATION_MANIFEST.md`, migration validators, deployment/release verifiers and workflow registers — updated to 167 source migrations.

## Verification performed

- `node scripts/verify-g19-hse-lifecycle-integrity.mjs` — PASS.
- `node scripts/verify-g19-hse-certification.mjs` — PASS.
- `node scripts/verify-operation-15-hse-site-compliance.mjs` — PASS.
- `node scripts/verify-g20-data-subject-privacy.mjs` — PASS; G-20 migration remains in chain, later G-19 addendum is accepted as latest.
- `node scripts/verify-g20-workflow-register-database-counts.mjs` — PASS.
- `node scripts/verify-g21-deployment-reconciliation.mjs` — PASS.
- `node scripts/verify-g22-release-readiness.mjs` — PASS.
- `node scripts/verify-migration-integrity.mjs` — PASS; 167 unique ordered migrations.
- `node scripts/verify-database-dependencies.mjs` — PASS; 167 migrations, 167 tables, 276 functions, 290 FK references.
- `node scripts/verify-all.mjs` — **193/193 passed, 0 failed**.

Counts are repository-source-derived, not a live Supabase catalog snapshot.

## Not run / not certified

- Migration was not applied to PostgreSQL/Supabase; SQL execution, function grants at runtime and role isolation remain unverified.
- No `npm ci`, TypeScript build, ESLint, Vite production build, browser or authenticated admin E2E was performed in this environment.
- No actual site walk, induction, toolbox talk, PPE inspection, equipment inspection, permit review, first-aid/fire drill or emergency-response test was performed.
- No site records or worker records were created or changed in live systems.
- No statutory HSE compliance, regulator acceptance, insurance compliance, worker competency, medical fitness or third-party certification is claimed.

## Required closure evidence

Use `docs/G-19-HSE-STAGING-AND-REAL-SITE-UAT-RUNBOOK-2026-11-10.md` and the associated evidence template. Staging must prove RPC authorization and lifecycle transitions using disposable records. A competent HSE lead must separately sign the actual site inspection, risk assessment, induction, toolbox, PPE, equipment, emergency and corrective-action evidence. Site-specific legal and statutory requirements must be reviewed by a competent local HSE professional.

**Disposition:** Source remediation complete; G-19 remains open until staging replay, role tests, real-site inspection and competent HSE sign-off are evidenced. No production deployment, live data mutation, commit or push was performed.
