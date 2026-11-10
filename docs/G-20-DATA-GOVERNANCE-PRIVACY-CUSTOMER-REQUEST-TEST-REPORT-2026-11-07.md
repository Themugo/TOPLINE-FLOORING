# G-20 — Data Governance, Privacy & Customer-Data Request Test Report

**Date:** 2026-11-07  
**Foundation:** G-13-based reliability UAT package supplied as the latest project foundation  
**Disposition:** Source remediation and static verification completed; live/staging privacy UAT remains OPEN.

## Executive result

The existing Operation 12 and G-18 governance framework already provided staff-only data-subject request records, due dates, request categories, evidence-backed closure, access reviews and an audited operational export. The source audit identified one important process-control gap: the request could be marked completed with a resolution and evidence reference without the workflow recording that the requester’s identity had been verified.

G-20 adds a staff-authorized, evidence-referenced identity-verification step and blocks successful completion until that step has been recorded. The governance snapshot exposes only the verification timestamp; it does not expose the protected verification evidence reference. This is a workflow control, not proof that the requested access, correction, portability, restriction or erasure has actually been carried out.

## Changes made

1. **Identity verification evidence:** Added `identity_verified_at` and `identity_verification_reference` to `data_subject_requests`, with a paired-value constraint and bounded evidence-reference length.
2. **Staff-authorized verification RPC:** Added `verify_data_subject_request`. It requires `customers:update`, a non-empty 3–500 character evidence reference, and an open request. It uses a conditional update so only one concurrent verification attempt can succeed.
3. **Completion gate:** Replaced `complete_data_subject_request` with a row-locked implementation. A `completed` outcome now requires prior identity verification, a resolution and a separate closure evidence reference. Rejected/cancelled outcomes still require a resolution and closure evidence but do not require identity verification where the request is being closed because it cannot proceed.
4. **Evidence minimization:** `get_data_governance_360` returns `identity_verified_at` but never returns `identity_verification_reference`.
5. **Admin workflow:** Added a Verify identity action, visible verified/unverified state, and disabled completion until verification has been recorded. The UI warns staff not to paste ID numbers or identity documents into reference fields.
6. **RPC grant regression:** Regenerated `supabase/tests/browser_rpc_grants.sql` from browser RPC calls so the new RPC is included in the SQL permission test inventory.
7. **CI and inventory reconciliation:** Added a dedicated G-20 verifier to npm and CI. Updated the migration manifest, source-derived workflow register counts, and guarded local/linked migration-count defaults.

## Source-derived repository inventory

| Item | Current source count |
|---|---:|
| Active SQL migrations | 166 |
| Tables | 167 |
| Functions | 276 |
| Foreign-key references | 290 |

These counts are derived from the repository SQL source. They are **not** a live Supabase catalog snapshot and do not establish that G-20 has been applied remotely.

## Verification performed

- `node scripts/verify-g20-data-subject-privacy.mjs` — PASS.
- `node scripts/verify-g18-data-governance.mjs` — PASS.
- `node scripts/verify-operation-12-data-governance.mjs` — PASS.
- `node scripts/verify-phase-13-backup-export-360.mjs` — PASS.
- `node scripts/verify-g20-workflow-register-database-counts.mjs` — PASS.
- `node scripts/verify-g21-deployment-reconciliation.mjs` — PASS.
- `node scripts/verify-g22-release-readiness.mjs` — PASS.
- `node scripts/verify-g19-hse-certification.mjs` — PASS after the migration-manifest chain was completed.
- `node scripts/verify-sql-runtime-safety.mjs` — PASS.
- `node scripts/verify-database-dependencies.mjs` — PASS (166 migrations, 167 tables, 276 functions, 290 FK references).
- `node scripts/verify-all.mjs` — **192/192 passed, 0 failed**.
- `node --check scripts/verify-g20-data-subject-privacy.mjs` — PASS.
- `package.json` JSON parse — PASS.
- ZIP integrity — PASS.

## Findings that remain open

- The G-20 SQL migration has not been applied to staging or production; PostgreSQL runtime, RLS and function grants have not been exercised against a database.
- No real or synthetic customer request was processed end-to-end in a running environment.
- The governance request register records workflow and evidence. It does not itself produce a customer data export, correct a customer record, restrict processing, erase records, or propagate deletion to storage, backups, logs or processors.
- The separate `customer-data-export` Edge Function invokes `create_operational_data_export`, which is a staff-only operational export requiring `system:read`; it is not a customer-scoped data-subject access/portability export. It must not be represented to a customer as their personal-data export.
- The operational export contains an allowlisted set of customer and business tables and records an SHA-256 audit event. The export permission and data scope require explicit owner approval and periodic review; this source test does not certify that the allowlist is appropriate for every operational purpose.
- The admin UI provides the completed path; rejected/cancelled handling should be exercised through the authorized RPC/API path and documented operator procedure until a dedicated UI outcome selector is added.
- Retention execution, backup expiry, log retention, provider deletion, lawful basis, statutory response deadlines, notices and cross-border transfer obligations need review by the organization's privacy/legal owner. This is not a legal compliance opinion.

## Safety boundary

No production database, customer record, consent state, storage object, payment/communications provider, DNS, hosting, Git remote, commit, push or deployment was changed. The new migration is additive and is not applied automatically.

## Certification decision

**NO-GO for live privacy certification until the staging UAT runbook is executed and evidence is approved.** Source contracts pass; live request handling and actual data-rights fulfilment remain unverified.
