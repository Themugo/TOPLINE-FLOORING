# Phase 15 — CRM Lifecycle Integrity Audit Report

Date: 2026-11-07
Foundation: `TOPLINE-FLOORING-PHASE-14-COMPLETE-2026-11-07.zip`
Scope: Phase 15 only — CRM lead-to-customer conversion integrity. Existing Phase 16 quotation-to-order/project and Phase 17 site-visit functionality was preserved and regression-checked, not redesigned.

## Outcome

Phase 15 is certified at source level. The existing transactional lead conversion is now independently enforced by a dedicated verifier and a separate GitHub Actions CI step that runs before the combined Phase 15–17 regression gate.

## Certified controls

- Lead conversion is implemented as a PostgreSQL `SECURITY DEFINER` transaction.
- The lead row is locked with `FOR UPDATE` during conversion.
- Customer matching uses normalized, trimmed, lowercase email.
- A transaction-scoped advisory lock serializes concurrent conversions for the normalized email.
- Missing lead email is rejected rather than creating an invalid customer.
- Repeated conversion of an already-converted lead returns the existing customer relationship (idempotency).
- The lead is marked won and linked to the canonical customer record within the transaction.
- A `lead_converted` lifecycle audit event is recorded.
- The RPC pins `search_path` and revokes execution from `PUBLIC` and `anon`, explicitly granting it to `authenticated`.
- The frontend continues to use the transactional lifecycle wrapper.

## Changes in this phase

1. Added `scripts/verify-phase-15-crm-lifecycle.mjs` with 13 focused source-contract assertions.
2. Registered `verify:phase-15-crm-lifecycle` in `package.json`.
3. Added a dedicated Phase 15 CI step before the existing combined Phase 15–17 verifier.
4. Extended `docs/PHASES_15_17_SALES_PROJECT_LIFECYCLE.md` with the Phase 15 certification contract.
5. Preserved existing Phase 16 and Phase 17 implementation and checks.

No new database migration was necessary; this phase isolates and certifies the existing transactional CRM controls without creating a duplicate data model.

## Validation

| Check | Result |
|---|---:|
| Phase 15 focused CRM verifier | 13/13 passed |
| Combined Phase 15–17 verifier | Passed |
| Operation 1 Commercial Lifecycle verifier | Passed |
| Migration integrity | Passed; 159 unique migrations |
| Migration deployment static check | Passed |
| SQL runtime safety static check | Passed |
| Phase 14 CI/release-gate verifier | Passed |
| CI YAML parse | Passed |
| package.json parse and script registration | Passed |
| Full repository verification | 162/162 passed, 0 failed |
| ZIP archive integrity | Passed |

Full verifier log: `TOPLINE-PHASE-15-VERIFY-ALL-2026-11-07.log` (provided separately with the audit deliverables).

## External validation still required

- Replay the complete migration chain against a disposable/staging PostgreSQL/Supabase instance.
- Exercise simultaneous lead conversions for the same normalized email and confirm one canonical customer is reused.
- Test authorized and unauthorized staff roles against the RPC in the live database.
- Run browser-level CRM workflow tests against staging.
- Confirm CI executes `npm ci`, lint, typecheck and production build on GitHub-hosted runners.

The local source/static checks do not substitute for database concurrency tests or staging UAT. No production database was changed. No deployment, Git commit or push was performed.

## Continuity

The Phase 15 ZIP is the authoritative foundation for Phase 16. The original `TOPLINE-FLOORING-main/` root folder and existing project structure are preserved.
