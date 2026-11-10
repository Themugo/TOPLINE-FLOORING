# G-19 HSE Further Audit and Remediation — 2026-11-10

## Foundation and scope

This update continues from `TOPLINE-FLOORING-G19-HSE-CERTIFICATION-REPAIRED-2026-11-10.zip` (source archive SHA-256: `0edbbd97b191a056fc1084809f8dc1d536b927b20e72899323e91fc4a856d5aca`). The existing project root, HSE tables, RPC architecture, route and RBAC model were retained. No production database, site records, provider configuration, Git history or deployment was changed.

## Further evidenced defect

The staff HSE dashboard called `get_hse_site_compliance_360()`, but the effective read-model projection omitted fields already captured by the write workflows and expected by the interface. Specifically, the response omitted:

- Site safety owner identity and display name.
- Emergency arrangements.
- Immediate-control evidence for events.
- Corrective-action owner display name and independent verifier/evidence details.

As a result, records could contain safety evidence that the operational dashboard could not display. This weakened supervisory review and made the UI's immediate-control evidence display ineffective.

## Corrections

A new additive migration was introduced:

`20261110140000_g19_hse_dashboard_evidence_and_owner_validation.sql`

It:

1. Extends the HSE snapshot with site owner, emergency, PPE, immediate-control, corrective-action owner and verification evidence fields.
2. Joins staff display names for responsible site owners, action owners and independent verifiers.
3. Requires a site safety owner to be an active staff profile.
4. Requires corrective-action owners to be active staff profiles.
5. Requires corrective-action due dates to be in the future.
6. Validates a supplied project reference before creating a site control.
7. Retains the existing permission-gated `SECURITY DEFINER` RPC boundary and authenticated-only execution.
8. Does not rewrite existing site, event or corrective-action records.

The HSE admin UI now visibly renders owner, PPE, emergency arrangements, immediate-control evidence and independent verification evidence.

## Source inventory reconciliation

The new migration increases the active source migration count from 167 to **168**. Workflow register JSON/CSV, migration manifest, deployment guidance, local/linked migration-count defaults, CI environment and G-20/G-21/G-22 source verifiers were updated. Repository-derived object counts remain 167 tables, 276 functions and 290 FK references; these are not a live Supabase catalog snapshot.

## Verification

Passed:

- `node scripts/verify-g19-hse-certification.mjs`
- `node scripts/verify-g19-hse-lifecycle-integrity.mjs`
- `node scripts/verify-operation-15-hse-site-compliance.mjs`
- `node scripts/verify-g20-workflow-register-database-counts.mjs`
- `node scripts/verify-g21-deployment-reconciliation.mjs`
- `node scripts/verify-g22-release-readiness.mjs`
- `node scripts/verify-g20-data-subject-privacy.mjs`
- `node scripts/verify-all.mjs` — **193/193 passed, 0 failed**
- ZIP archive integrity check after packaging.

## Not certified / still outstanding

`npm ci --ignore-scripts --no-audit --no-fund` did not complete within the available execution window. Therefore TypeScript, ESLint and Vite production build were not successfully run in this pass. No local PostgreSQL, Supabase CLI or Docker replay was performed. The new migration must be replayed against a disposable database before staging approval. Actual site inspections, PPE checks, inductions, emergency drills, toolbox talks, worker consultation and competent HSE sign-off remain real-world evidence gates.

## Release disposition

**Source remediation: PASS. Repository static verification: PASS (193/193). Build/database replay/site certification: PENDING. Production release: NO-GO until external gates are evidenced.**
