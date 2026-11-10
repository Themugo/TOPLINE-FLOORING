# G-18 — Data Governance & Privacy Certification Report
**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-17-RELIABILITY-CERTIFICATION-2026-11-07.zip`  
**Foundation SHA-256:** `efd51684a18153bc145555717d9ce3b6ff048b10dad8d3083cf4f8b866d091db`

## Executive result
**Source-level remediation completed; G-18 remains OPEN pending staging/live evidence.** The existing Operation 12 governance framework was present, but the audit found that request closure could omit its promised evidence reference and the admin page did not expose the pending staff access-review workflow. The G-18 update hardens these controls and adds a focused CI verifier.

## Findings and changes
1. **Data-subject request closure did not enforce evidence.** The existing RPC accepted a completed/rejected/cancelled outcome with a null evidence reference, while the admin page only asked for a resolution. The new migration requires a non-empty 3–500 character evidence reference, refuses to close an already closed/non-open request, and returns an explicit evidence-recorded indicator. The UI now asks for a reference and warns operators not to paste personal data into it.
2. **Staff access reviews were not operationally surfaced.** The snapshot RPC returned pending reviews and the client type represented them, but the admin page did not render them or provide an entry point. The page now displays pending reviews and allows staff to record a pending or completed outcome.
3. **Access-review integrity was too permissive.** The new RPC rejects self-review, past due dates, non-array or oversized role snapshots, completed reviews without a role snapshot, and adverse outcomes without findings. It retains the existing staff permission boundary and authenticated-only execution grant. It records evidence only; it does not alter staff permissions.
4. **Request identity capture was ambiguous in the UI.** Request creation now asks for the customer record UUID and explicitly labels when a blank association is appropriate. The underlying request workflow still supports a verified non-customer data subject where applicable.
5. **Read failure could leave stale governance data visible.** The page now clears the prior snapshot when refresh fails, avoiding stale metrics being mistaken for current state.

## Verification performed
- `node scripts/verify-g18-data-governance.mjs` — PASS.
- `node scripts/verify-operation-12-data-governance.mjs` — PASS.
- `node scripts/verify-g17-reliability-certification.mjs` — PASS (12/12).
- Active migration sequence checked: 164 uniquely timestamped migrations; latest is `20261107220000_g18_data_governance_privacy_evidence_hardening.sql`.
- Migration manifest count and latest-source pointer updated.
- G-18 source verifier registered in package scripts and CI before build artifact upload.
- ZIP integrity test — PASS.

## Not run / not certified
- No `node_modules` directory was present in the supplied project ZIP, so a full TypeScript/Vite build and browser test were not run.
- The new SQL migration was not applied to a Supabase project; PostgreSQL execution, grants, RLS behavior and RPC runtime behavior remain unverified.
- No real customer data-subject request was processed. No actual export, correction, restriction, erasure or provider-side deletion was performed.
- No staff access review was executed against live staff accounts; no permissions were changed.
- Retention periods, lawful bases, consent wording, cross-border transfers, processor contracts, breach notification and statutory deadlines require review by the organization's qualified privacy/legal owner under applicable Kenyan law and any other relevant jurisdictions. This source audit is not a legal compliance opinion.
- Backup, log, email/SMS provider and third-party retention/deletion behavior is not proven by these application controls.

## Staging acceptance required to close G-18
1. Apply the migration through the approved staging migration process and verify migration history.
2. Test closure with missing/blank evidence (must fail), valid evidence (must pass), duplicate closure (must fail), and each terminal outcome.
3. Test self-review rejection, past-due rejection, malformed/oversized role snapshot rejection, adverse outcome without findings rejection, and valid independent review.
4. Verify staff with permitted roles can use the dashboard; unauthorized staff and anonymous users cannot execute privileged RPCs or read underlying tables.
5. Process test-subject access, correction, portability and deletion requests end-to-end, recording lawful decision, identity verification, response evidence and any exceptions/holds.
6. Verify retention/deletion behavior across primary database, object storage, backups, application logs and each configured communications/payment processor.
7. Obtain documented privacy-owner/legal approval of classification, retention schedule, lawful bases, notices, processor inventory and escalation process.

**Disposition:** Remediated in source; awaiting staging UAT, database execution and privacy-owner sign-off. No production deployment, live data mutation, commit or push was performed.
