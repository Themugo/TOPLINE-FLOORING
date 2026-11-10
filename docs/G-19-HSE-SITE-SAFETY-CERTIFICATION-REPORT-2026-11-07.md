# G-19 — Health, Safety & Environment Certification Report
**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-18-DATA-GOVERNANCE-PRIVACY-CERTIFICATION-2026-11-07.zip`  
**Foundation SHA-256:** `2afdb3f54f914165485d569bdf41992e9c9306d1a622a9e849944783745d7b7a`

## Executive result
**Source-level HSE workflow hardening completed; G-19 remains OPEN pending staging and real-site evidence.** The existing Operation 15 HSE framework was present, including site controls, event records, corrective actions, verification and staff-authorized RPCs. The audit found important lifecycle and operational-capture gaps. These are addressed by an additive migration, admin workflow improvements and a focused source verifier.

## Findings and remediation
1. **High-risk events could be recorded without immediate control evidence.** The event UI did not collect the `immediate_control` field even though the RPC supported it. The updated UI captures it; the new RPC requires it for incidents and high/critical events and requires it again before progression to controlled/resolved/closed.
2. **Corrective actions could skip the completion and independent verification stages.** The previous RPC accepted `verified` or `closed` without proving the preceding lifecycle state. The new state machine enforces `completed → verified → closed`, requires verification notes, and prevents verified/closed actions from being reopened or downgraded.
3. **Resolved or closed HSE events could be reopened or downgraded.** The new event RPC rejects reopening/downgrading terminal event states while retaining the gate that all linked corrective actions must be verified or closed before event closure.
4. **Site readiness fields were not captured in the admin create flow.** Site creation now asks for PPE requirements, emergency arrangements and a next review date. Existing induction-required behavior remains enabled by default.
5. **Corrective action accountability fields were omitted from the admin create flow.** Action creation now collects a responsible owner UUID and due date.
6. **Blocked corrective actions had no valid resume path in the UI.** The action workflow now moves blocked actions back to `in_progress`.
7. **Failed snapshot loads could leave old HSE figures visible and failed reads could look like zero.** Failed loads clear the snapshot; metrics display unavailable (`—`) until a successful snapshot exists, and empty states distinguish unavailable data from a successful zero result.

## Verification performed
- `node scripts/verify-g19-hse-certification.mjs` — PASS.
- `node scripts/verify-operation-15-hse-site-compliance.mjs` — PASS.
- `node scripts/verify-g18-data-governance.mjs` — PASS.
- `node scripts/verify-operation-12-data-governance.mjs` — PASS.
- `node scripts/verify-g17-reliability-certification.mjs` — PASS (12/12).
- Active migration chain: 165 uniquely timestamped migrations; latest is `20261107230000_g19_hse_site_safety_integrity.sql`.
- Migration manifest, package scripts and CI gate updated.
- ZIP integrity test — PASS.

## Not run / not certified
- No `node_modules` directory was present in the foundation ZIP; full TypeScript/Vite build, lint and browser/E2E tests were not run.
- The migration was not applied to Supabase; PostgreSQL execution, grants and runtime state transitions remain unverified.
- No actual site walk, worker induction, toolbox talk, PPE inspection, equipment inspection, first-aid/fire drill or emergency-response test was performed.
- No incident, near-miss or corrective-action records were created or modified in live data.
- No statutory HSE compliance, regulator acceptance, insurance compliance, medical fitness, training competency or third-party certification is claimed. Site-specific risk assessments, method statements, permits, training records, safety data sheets and statutory registers require competent HSE review under applicable Kenyan law and any other relevant jurisdiction.

## Staging and real-site acceptance required to close G-19
1. Apply the migration through the approved staging migration process and verify migration history.
2. Verify authorized staff can execute the HSE RPCs and unauthorized/anonymous users cannot read or mutate underlying tables.
3. Test missing immediate control for incidents/high/critical events (must fail), valid immediate control (must pass), and evidence required before risk progression.
4. Test corrective action transitions: open → in_progress → completed → verified → closed; ensure direct open → verified, completed → closed, and reopening verified/closed actions fail. Confirm blocked → in_progress works.
5. Test event closure fails while any linked action is unverified and succeeds only after all linked actions are verified/closed; verify resolved/closed events cannot be reopened.
6. Conduct and document real site inspections: risk assessment, induction, PPE, emergency arrangements, first aid/fire controls, equipment condition, permits and toolbox talks, with corrective actions assigned to named owners and due dates.
7. Obtain competent HSE owner sign-off and preserve evidence in the approved records repository.

**Disposition:** Source remediation complete; awaiting staging database execution, operational UAT and competent HSE/site sign-off. No production deployment, live data mutation, commit or push was performed.


## Follow-up status — 2026-11-10
The G-19 source controls were further hardened after additional lifecycle review. See `G-19-HSE-CERTIFICATION-REMEDIATION-ADDENDUM-2026-11-10.md` for sequential event/action transitions, resolved-to-closed progression, mandatory accountable owners and due dates, independent verification, and updated migration inventory. The original staging and real-site evidence requirements remain open.
