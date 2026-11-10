# G-23 — Actual Backup Restoration & RPO/RTO Drill

Date: 2026-11-07

## Objective

Move beyond source-level disaster recovery readiness and define an executable, auditable restore
drill using real Supabase-managed backup/PITR and an isolated recovery project, including a
separate Storage object restore and measured RPO/RTO.

## Source findings

The prior G-11.1 work correctly left the recovery gap open: no provider backup/PITR reference,
isolated restore, Storage backup/restore manifest or measured RPO/RTO was present. Its evidence
runner accepted manually entered durations and did not derive them from a consistent incident,
recovery-point and service-restored timeline.

## Changes

1. Added `docs/G-23-ACTUAL-BACKUP-RESTORE-RPO-RTO-DRILL-RUNBOOK.md` with approval gates, isolated
   Supabase database restore, separate Storage recovery, database/application validation,
   timestamp definitions, evidence requirements and cleanup/closure rules.
2. Added `docs/drill-evidence.template.json` for real provider and operator evidence.
3. Added `scripts/verify-g23-dr-drill-evidence.mjs` to derive RPO from incident start minus the
   latest committed transaction present in the restored data, and RTO from incident start to
   service-restored time. It rejects production-as-target, invalid timestamps, missing approvals,
   missing Storage evidence and any failed validation category.
4. Added npm scripts and a CI syntax gate.
5. Updated the prior G-11.1 report to cross-reference the actual drill gap.

## Verification and status

- Validator JavaScript syntax: PASS.
- Evidence template JSON parse: PASS.
- Source-only G-11.1 and Operation 11 checks are retained.
- No real evidence file was available, so the drill validator is expected to fail closed when
  invoked without `artifacts/g23-disaster-recovery/drill-evidence.json`.
- No database restore, Storage restore, failover, provider API operation, production access,
  DNS change or external integration was performed.

**Outcome: OPEN / NOT EXECUTED.** No actual RPO or RTO can be reported from this workspace.
Business owners must approve targets before execution. An operator with Supabase Dashboard
access must restore to a new project, separately restore Storage objects, validate integrity,
and submit provider-generated artifacts for independent review.

## Safety

The canonical production project `cvjmfplhdlfvqnnmzqcp` was not contacted or modified. No secrets
were added. No production migration, deployment, commit or push was performed.
