# TOPLINE Flooring & Waterproofing — Master Audit Remediation (G-13 Foundation)

**Date:** 2026-11-07  
**Authoritative foundation:** `TOPLINE-FLOORING-G-13-EMAIL-DELIVERABILITY-SPF-DKIM-DMARC-2026-11-07.zip`  
**Foundation SHA-256:** `a3066a67481bb0ecd2af945779812ee1d8962126722c1eb3e4a069784c207ac0`  
**Project root preserved:** `TOPLINE-FLOORING-main/`  
**Scope:** Repository-level corrections supported by the master end-to-end operations audit and production-readiness remediation findings.  
**Safety boundary:** No production database, linked Supabase project, customer records, DNS, email/payment provider, Vercel deployment, Git remote, commit or push was modified.

## 1. Foundation correction

This remediation was rebuilt from the G-13 ZIP above, not from the Phase 19 ZIP. The G-13 foundation contains **165 active migrations**, not 163. Its existing G-21 deployment reconciliation already pins the canonical Supabase project and documents the 165-migration source inventory. The earlier master audit's 163 count is a historical snapshot and must not overwrite the later G-13 foundation's verified source count.

## 2. Defects corrected

### R-01 — CSV master workflow register was stale while JSON was current

`docs/MASTER-WORKFLOW-REGISTER.json` and the G-20 verifier already reflected 165 migrations, 167 tables, 275 functions and 290 FK references. The CSV still reported 158 migrations and 274 functions.

**Repair:** Updated only the WF-12 row in `docs/MASTER-WORKFLOW-REGISTER.csv` to match the current source-derived inventory and clearly qualify it as repository-derived, not a live Supabase catalog count.

**Regression protection:** Extended `scripts/verify-g20-workflow-register-database-counts.mjs` to validate both JSON and CSV, including stale-count rejection in both formats.

### R-02 — CI artifact-order verifier treated an early evidence upload as the production build upload

The CI workflow intentionally uploads disposable database replay evidence before later static, frontend and operations gates. The Phase 14 verifier selected the first `actions/upload-artifact` occurrence and incorrectly treated it as the production build artifact. This made the verifier fail even though the specifically named production build upload is last, after the gates.

**Repair:** The verifier now locates the specifically named `Upload production build` step and checks that this artifact is uploaded after the build and final architecture gates. Earlier diagnostic/evidence uploads are allowed and remain in place.

### R-03 — CI local-reset safety scope was not regression-protected

The G-13 foundation already scopes `TOPLINE_ALLOW_LOCAL_DB_RESET: 'true'` to the dedicated `Local Supabase replay` step and uses `npm run validate:local-db`. The verifier did not enforce this contract.

**Repair:** Added assertions that the dedicated step exists, invokes the guarded local-only validator, contains the opt-in, and is the only occurrence of that variable in the workflow. Workflow/job-wide opt-in is rejected.

### R-04 — Payment audit verifier rejected the stronger M-Pesa identity guard

The callback already rejects missing MerchantRequestID, missing stored provider reference, or a mismatch with the initiated transaction. The audit verifier searched for an older, weaker expression and falsely reported that the binding was absent.

**Repair:** Updated `scripts/verify-payment-audit-360.mjs` to assert the actual fail-closed condition, requiring both identifiers and exact equality.

### R-05 — Evidence validators were incorrectly included in aggregate static verification

The aggregate `verify-all` runner attempted to execute G-13 inbox evidence and G-23 disaster-recovery evidence validators as if they were source-only checks. Both correctly fail closed when real external evidence files are absent. This caused a misleading aggregate failure unrelated to source correctness.

**Repair:** Excluded only these two evidence-dependent validators from `verify-all`. They remain explicit standalone closure gates and continue to report BLOCKED when their real evidence artifacts are absent. Payment provider UAT scripts remain separately excluded as before.

## 3. Existing G-13 foundation corrections retained

The G-13 archive already contains the corrected canonical deployment guide, G-21 source/remote safety boundary, step-scoped local database reset opt-in, and G-20 JSON/database inventory reconciliation. These were retained; no duplicate guide, migration or project root was created.

## 4. Verification performed

| Check | Result |
|---|---|
| `node scripts/verify-phase-14-ci-release-gate.mjs` | PASS |
| `node scripts/verify-g20-workflow-register-database-counts.mjs` | PASS — JSON and CSV validated |
| `node scripts/verify-g21-deployment-reconciliation.mjs` | PASS — canonical project and 165 migrations |
| `node scripts/verify-migration-integrity.mjs` | PASS — 165 unique ordered migrations |
| `node scripts/verify-database-dependencies.mjs` | PASS — 165 migrations, 167 tables, 275 functions, 290 FK references |
| `node scripts/verify-payment-audit-360.mjs` | PASS |
| `node scripts/verify-all.mjs` | **188/188 passed, 0 failed** |

The aggregate suite is source/static verification. The standalone G-13 inbox and G-23 disaster-recovery evidence validators remain fail-closed and were not given fabricated evidence.

## 5. Outstanding external certification — not marked complete

The master audit's external gates remain open where actual environment access or real-world evidence is required:

- G-01: verify repository publication and remote SHA in the owner's GitHub account.
- G-02: fresh disposable PostgreSQL 17/Supabase migration replay and SQL tests.
- G-03: authenticated linked Supabase migration list, dry-run and lint review; no remote push without separate approval.
- G-04: green hosted CI run for the exact reviewed commit, including `npm ci`, lint, typecheck and Vite build.
- G-05/G-11: payment sandbox initiation, callback, refund and finance reconciliation.
- G-06/G-07: real outbox-to-worker-to-provider delivery, scheduler/Vault configuration and execution logs.
- G-08: live RLS/RPC/Storage positive and negative role matrix.
- G-09/G-15: complete browser/device E2E, responsive screenshots and live CRM reconciliation.
- G-10: real Supabase Auth confirmation/recovery/session/account-link UAT.
- G-12/G-23: isolated database and storage restore with measured RPO/RTO and real drill evidence.
- G-13: public DNS SPF/DKIM/DMARC, exact provider selector, sender verification and real inbox/header evidence.
- G-14/G-16: staging commerce concurrency and project/site-visit/installation/fulfilment acceptance.
- G-17: real alert delivery, incident response and recovery drill.
- G-18: live privacy access/export/correction/deletion/retention workflow evidence.
- G-19: real-site HSE checklist, incident and corrective-action closure.
- G-22: approved environment inventory and secret ownership/rotation evidence.

No production readiness or live-delivery claim is made from these source checks.

## 6. Files changed

- `.github/workflows/ci.yml` — unchanged; its existing safe step-scoped reset permission was protected by a stricter verifier.
- `scripts/verify-phase-14-ci-release-gate.mjs`
- `scripts/verify-g20-workflow-register-database-counts.mjs`
- `scripts/verify-payment-audit-360.mjs`
- `scripts/verify-all.mjs`
- `docs/MASTER-WORKFLOW-REGISTER.csv`
- `docs/MASTER-AUDIT-REMEDIATION-REPORT-G13-FOUNDATION-2026-11-07.md`

**Release decision:** Source-level audit corrections are complete for the defects listed above. Production certification remains **NO-GO** until the external gates are executed and evidenced.
