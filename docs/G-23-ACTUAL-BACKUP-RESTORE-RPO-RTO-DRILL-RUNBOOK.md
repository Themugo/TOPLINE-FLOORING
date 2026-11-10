# G-23 — Actual Backup Restoration & RPO/RTO Drill Runbook

**Status: NOT EXECUTED — requires authorised Supabase owner and an isolated recovery project.**

This runbook is deliberately designed to restore into a **new, isolated project**, never over the
canonical production project. The current canonical project is `cvjmfplhdlfvqnnmzqcp`.
The project archive does not contain provider credentials or backup artifacts, and no restore
has been performed by this work.

## 1. Approval and safety gates

Before starting, the recovery owner must record:

- incident/simulation start time in UTC (`T0`);
- approved RTO and RPO targets, in minutes (the business owner must set these; do not infer them);
- source project reference and selected provider backup/PITR recovery point;
- restore operator, observer, change/ticket ID and cost approval for a new Supabase project;
- an isolated target project reference that is **not** the canonical production project;
- confirmation that restored scheduled jobs, `pg_cron`, webhooks, triggers and external integrations
  cannot send real customer communications, charge payments or mutate production systems.

**Stop** if the isolated target, cost approval, backup point, storage backup, target RTO/RPO or
owner approvals are missing. Do not run a restore against production. Do not run
`supabase db reset --linked`.

## 2. Database restore — managed Supabase backup

1. In the Supabase Dashboard, open the canonical source project and navigate to **Database →
   Backups** (or **Point in Time** if PITR is enabled).
2. Record the earliest/latest available recovery points and the selected backup/PITR timestamp.
   Save a redacted screenshot or provider-generated export as evidence.
3. Use **Restore to a New Project** and create a separate recovery project in the same region.
   Review the quoted cost and configuration before confirming.
4. Record restore request time, provider job/reference, completion time and target project ref.
5. Do not point the production frontend, custom domain, Auth callbacks or payment webhooks at
   this recovery project. Keep outbound integrations disabled or safely redirected.
6. Record any manual reconfiguration required after clone: Storage objects/settings, Edge
   Functions, Auth settings/API keys, Realtime, extensions/settings and read replicas.

Supabase's documented clone flow copies database schema, data, indexes, roles/permissions and
Auth data, but does **not** copy Storage objects/settings, Edge Functions, Auth settings/API keys,
Realtime settings, extensions/settings or read replicas. Binary cloning can start enabled
`pg_cron`, `pg_net`, wrappers and external triggers immediately after restore; inspect and isolate
these before allowing the recovery environment to run.

## 3. Storage restore — separate from database

Database backups do not include the actual objects stored by the Storage API. A database restore
can recover bucket/file metadata while the corresponding object bytes are still absent.

1. From the approved independent Storage backup/export, record bucket list, object count, total
   bytes, backup timestamp and manifest/checksum reference.
2. Restore objects into the isolated recovery project's corresponding buckets using the
   approved Storage/S3 transfer procedure. Do not copy secrets or expose public buckets.
3. Compare source-backup manifest against restored target: bucket names, object keys, object
   counts, byte sizes and checksums where available.
4. Verify representative private/public access paths with test identities and confirm RLS/policies.
5. Record missing, corrupt or inaccessible objects as failures. Do not call Storage recovered
   solely because database metadata exists.

If no independent Storage backup exists, mark storage recovery **FAILED / NO BACKUP**, not passed.

## 4. Database integrity and application validation

Run read-only validation against the isolated target and retain redacted output:

- confirm expected schemas, tables, views, functions and extensions exist;
- compare critical table row counts to the selected recovery point or a trusted backup manifest;
- check primary-key uniqueness and foreign-key/orphan invariants for critical business records;
- inspect auth user counts and test sign-in/recovery only with approved test accounts;
- verify RLS is enabled on sensitive tables and role grants remain least-privilege;
- verify required buckets and object manifests as described above;
- confirm Edge Functions, secrets, Auth URLs, Realtime and external integrations are explicitly
  reconfigured or remain disabled;
- run a small business smoke test: catalogue read, test customer/order/project/invoice records,
  admin access, file retrieval and audit trail. Never use real payment credentials or contact
  customers during the drill.

The recovery owner must define the critical datasets and expected invariants before the drill.
A successful database process notification alone is not an integrity pass.

## 5. Measure RPO and RTO

Use UTC timestamps from provider evidence and the drill observer:

- `incident_declared_at`: simulated disaster start (`T0`);
- `recovery_point_at`: timestamp of the latest committed source transaction demonstrably
  present in the restored database (not merely the backup job timestamp);
- `service_restored_at`: time when the isolated service passed database, storage, auth and
  agreed business smoke tests and was declared usable by the observer.

Calculate:

- **Measured RPO (minutes)** = `incident_declared_at - recovery_point_at`.
- **Measured RTO (minutes)** = `service_restored_at - incident_declared_at`.

If the selected recovery point is later than the incident time, the timeline is invalid and must
be investigated. If the last committed transaction cannot be established, RPO is **UNKNOWN**,
not zero. If the service has not passed all agreed checks, RTO is **NOT ACHIEVED**.

Compare both measurements with the approved business targets. Record target owner and approval.
Do not select targets after seeing the result.

## 6. Evidence package

Create `artifacts/g23-disaster-recovery/` and include:

- `drill-evidence.json` based on `drill-evidence.template.json`;
- provider-generated backup/PITR record and restore-job reference (redacted);
- isolated target project reference and configuration summary (no secrets);
- database validation output and critical table count manifest;
- Storage backup manifest, restore log and checksum comparison;
- application smoke-test results;
- UTC start/end timestamps and calculated RPO/RTO;
- named operator, independent observer and business owner sign-off;
- corrective actions, owner and due date for every failed check.

Never include access tokens, passwords, service-role keys, connection strings, payment credentials,
customer personal data or unredacted user records. Store large original provider artifacts in the
approved secure evidence store and reference their immutable IDs/URLs here.

## 7. Cleanup and closure

Keep the restored project until the recovery owner and business owner accept the evidence.
Then obtain explicit approval before deleting the temporary project; preserve evidence first.
Do not change production DNS, database connection strings, provider configuration or live data
as part of this drill.

G-23 closes only when the database **and** Storage restore pass, integrity and application checks
pass, RPO/RTO are calculated from verified timestamps and meet the pre-approved targets, and
technical/business owners sign the evidence. Otherwise retain the failed result and corrective
actions.

## Authoritative Supabase references

- Database backups and PITR: https://supabase.com/docs/guides/platform/backups
- Restore to a new project: https://supabase.com/docs/guides/platform/clone-project

These provider capabilities and exclusions must be rechecked against the actual plan/project
before execution.
