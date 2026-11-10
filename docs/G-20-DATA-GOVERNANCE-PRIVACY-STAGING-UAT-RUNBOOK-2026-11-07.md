# G-20 — Data Governance & Customer-Data Request Staging UAT Runbook

**Environment:** isolated staging only. Use synthetic test subjects and synthetic records.  
**Do not use production customer data or real identity documents.**  
**Prerequisites:** approved staging project, current backup, authorized staff test accounts, migration approval, secure evidence store and a named privacy/UAT owner.

## Pre-flight

1. Confirm the Supabase project reference and database host are the approved staging target; reject the canonical production project.
2. Confirm the staging database is backed up and rollback/recovery is available.
3. Apply migrations only through the approved staging process; verify the migration history includes `20261107240000_g20_data_subject_identity_verification.sql`.
4. Confirm the test customer and all related rows are synthetic. Record test IDs in the secure UAT evidence system, not in this report or public issue trackers.
5. Prepare staff accounts for `customers:update`, `reports:select`, `system:read`, a staff user without those permissions, an ordinary customer and anonymous access.
6. Use opaque evidence references such as `UAT-PRIV-CASE-001`; never store ID numbers, identity document images, access tokens or personal data in evidence-reference columns.

## Test matrix

| ID | Scenario | Expected result |
|---|---|---|
| G20-01 | Authorized staff creates an access request for a synthetic customer | Request created in `received`; due date present |
| G20-02 | Create request with unsupported request type | Rejected |
| G20-03 | Create request with past/null due date | Rejected |
| G20-04 | Create request with unknown customer UUID | Rejected |
| G20-05 | Staff without `customers:insert` creates request | Permission denied |
| G20-06 | Anonymous caller creates request | Denied |
| G20-07 | Verify identity with blank/whitespace evidence reference | Rejected |
| G20-08 | Verify identity with reference shorter than 3 or longer than 500 chars | Rejected |
| G20-09 | Verify identity for open request with valid opaque evidence reference | Status becomes `verifying`; timestamp and reference recorded |
| G20-10 | Attempt verification without `customers:update` | Permission denied |
| G20-11 | Attempt verification for nonexistent or terminal request | Rejected |
| G20-12 | Two staff sessions verify the same unverified request concurrently | Exactly one succeeds; no duplicate verification record |
| G20-13 | Governance snapshot after verification | Shows verification timestamp; does not expose evidence reference |
| G20-14 | Complete request before identity verification | Rejected; request remains open |
| G20-15 | Complete verified request with missing/short resolution | Rejected |
| G20-16 | Complete verified request with missing/blank closure evidence | Rejected |
| G20-17 | Complete verified request with valid resolution and evidence | Completed; completion time and updater recorded |
| G20-18 | Attempt second completion of terminal request | Rejected |
| G20-19 | Reject/cancel request with valid resolution and closure evidence but no identity verification | Allowed only when operator records a valid reason and policy permits closure |
| G20-20 | Unauthorized staff completes or verifies request | Permission denied |
| G20-21 | Customer/anonymous reads governance tables directly | Denied by RLS/grants |
| G20-22 | Customer attempts to invoke staff operational export | Denied |
| G20-23 | Staff with `customers:read` but without `system:read` invokes operational export | Denied |
| G20-24 | Staff with `system:read` invokes operational export | Export created; allowlisted table counts and SHA-256 audit event recorded |
| G20-25 | Staff without `system:read` reads export audit events | Denied |
| G20-26 | Confirm operational export is not used as a customer-specific portability response | Operator procedure must keep the workflows separate |
| G20-27 | Process synthetic correction request | Actual corrected fields independently checked; evidence stored securely |
| G20-28 | Process synthetic restriction/objection request | Actual processing restriction and downstream scope verified; do not infer from request status |
| G20-29 | Process synthetic deletion request | Approved deletion/exception decision checked across DB, Storage, logs, backups and processors; no false claim based only on request closure |
| G20-30 | Process synthetic access/portability request | Customer-scoped export is assembled, minimized, securely delivered and delivery evidence retained |
| G20-31 | Verify marketing opt-out | Preference state and outbound Brevo sync queue show unsubscribe; no new subscription after opt-out |
| G20-32 | Verify retention policy due date | Overdue policy is visible; no automatic deletion is assumed unless a separately approved job is proven |
| G20-33 | Verify evidence references and logs | References contain no personal data/secrets; access to evidence store is restricted and audited |
| G20-34 | Verify due-date monitoring/escalation | Overdue request appears in metrics and reaches the designated privacy owner |
| G20-35 | Verify data export exception/hold | Legal or operational hold is documented; request is not falsely marked fulfilled |
| G20-36 | Verify full customer and staff workflow on desktop/mobile | Correct role gates, clear status, no stale-data/false-zero state, usable retry and accessible controls |

## Required evidence per test

- Test ID and execution timestamp.
- Staging project reference (never production secrets or full connection strings).
- Synthetic request ID and synthetic customer ID, stored only in the approved evidence location.
- Actor role/permission set, not access tokens.
- Expected result, actual result and PASS/FAIL/BLOCKED.
- Sanitized screenshot or SQL assertion output where appropriate.
- Evidence reference and reviewer sign-off.

## SQL/runtime checks

Run the generated browser RPC grant test and the approved staging RLS suite. Confirm the new `verify_data_subject_request(uuid,text)` function is executable only by authenticated callers and still enforces `customers:update` inside the function. Confirm `complete_data_subject_request` locks the request row and checks identity verification before a `completed` transition. Confirm `get_data_governance_360` does not expose `identity_verification_reference`.

## Stop conditions

Stop and mark the relevant case BLOCKED if the environment cannot be proven to be staging, a permission boundary differs from expectation, real personal data is present, an export exceeds its approved scope, deletion cannot be reconciled across systems, or a request would be falsely marked fulfilled. Do not improvise a production test.

## Closure criteria

G-20 may be closed only after all applicable cases pass, failures have tracked remediation, the privacy owner signs off on request handling and evidence, and the legal/privacy owner approves the retention and fulfilment procedure for applicable jurisdictions. This runbook is an operational test plan, not a legal opinion.
