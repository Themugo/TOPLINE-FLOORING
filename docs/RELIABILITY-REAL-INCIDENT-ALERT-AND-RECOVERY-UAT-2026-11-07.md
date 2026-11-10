# Reliability — Real Incident Alerts & Recovery UAT

**Status: OPEN — source controls exist; real alert delivery and recovery have not been executed.**

## Foundation and scope

This workstream continues from the G-13-based project delivery UAT package. It covers a controlled synthetic incident in staging, provider-originated alert delivery, incident lifecycle recording, isolated database and object-storage recovery, and measured RTO/RPO. It does not authorize production fault injection, production restore, DNS cutover or customer notification.

## Source audit findings

- The application has a durable `operational_incidents` register and permission-gated create/update/read RPCs. Updates lock the incident row (`FOR UPDATE`) and record acknowledgement, mitigation and resolution timestamps.
- The admin reliability console is an incident register, not an infrastructure monitoring agent. It explicitly does not establish health for Supabase, Vercel, DNS, payment providers, messaging providers or other external systems.
- The reviewed source contains no confirmed end-to-end provider alert receiver/dispatcher for those systems. A manually recorded incident is not evidence that a provider alert was delivered. Provider-side monitors and notification routing must be configured and tested independently.
- Existing G-11.1/G-23 recovery material correctly distinguishes application evidence references from actual managed-provider backup/PITR and Storage object restoration. Actual restore, measured RTO/RPO and owner sign-off remain unexecuted.
- No production migration or provider configuration was changed in this workstream.

## Required staging execution

1. Approve a staging-only synthetic incident and name operator and independent observer. Confirm the staging project is not the canonical production project.
2. Configure a provider-side monitor against a harmless staging health check. Route the alert to the approved test channel/on-call recipient. Capture the provider event ID and delivery receipt.
3. Trigger a controlled test condition (for example, a staging-only health endpoint returning a deliberate failure). Confirm provider alert creation, delivery, acknowledgement and recovery notification. Do not simulate by disabling production services.
4. Record the incident in the admin console. Verify the incident number, severity, domain, owner, detected timestamp and permissions. Progress Open → Investigating → Mitigated → Resolved; resolution must include a meaningful summary.
5. Verify unauthorized users cannot create/update incidents and cannot read the protected snapshot. Verify critical/high incidents are assigned to an owner during the drill; the current database contract does not itself enforce that policy, so record any unassigned item as a finding.
6. Perform database restore to a new isolated recovery project using the approved provider backup/PITR procedure. Do not restore over source or production.
7. Restore object storage separately and validate bucket/object manifests and checksums. Database metadata alone is not proof that object bytes were recovered.
8. Run read-only schema/RLS/grant checks and approved synthetic business smoke tests. Keep outbound jobs, webhooks, payment calls and customer communications disabled or redirected.
9. Calculate RPO from the latest committed transaction demonstrably present in the restored database, and RTO from simulated incident declaration to validated usable service. Compare with targets approved before the drill.
10. Obtain operator, observer and business owner sign-off. Retain failures and corrective actions; do not relabel partial recovery as success.

## Acceptance criteria

- Provider alert generated from the staging fault and independently visible in provider event history.
- Alert delivered to the intended test recipient/channel with timestamps and a traceable provider reference.
- Incident acknowledged, owned, mitigated and resolved with consistent timestamps and resolution summary.
- Role boundaries deny unauthorized mutation/read attempts.
- Database restore and Storage object restore both pass independent integrity checks.
- Business smoke tests pass without contacting customers or charging payment methods.
- Measured RTO/RPO meet pre-approved targets and have timestamp-backed evidence.
- Evidence package contains no secrets or personal customer data; independent reviewer signs closure.

## Evidence validator

`npm run uat:reliability-incident` validates a redacted evidence JSON file. It requires explicit staging mode and opt-in, rejects the canonical project ref, checks provider alert reference, lifecycle timestamps, database/storage/business validation flags, RTO/RPO targets and likely secret leakage. It emits a sanitized summary marked `EVIDENCE_VALIDATED_NOT_INDEPENDENTLY_VERIFIED`. It does not create an alert, restore a database, inspect provider systems or independently verify the evidence.

Example (after the staging evidence file is prepared):

```bash
TOPLINE_INCIDENT_UAT_ENV=staging \
TOPLINE_ALLOW_INCIDENT_UAT=true \
TOPLINE_INCIDENT_STAGING_PROJECT_REF=<staging-ref> \
TOPLINE_INCIDENT_UAT_EVIDENCE_FILE=artifacts/reliability-incident-uat/evidence.json \
npm run uat:reliability-incident
```

## Explicit non-actions

No production outage was induced. No production database was restored, reset or modified. No production DNS, webhook, alert route, payment provider, messaging provider or deployment configuration was changed. No Git commit or push was made.

The generated status is `EVIDENCE_VALIDATED_NOT_INDEPENDENTLY_VERIFIED`; evidence is **not independently verified** by the validator.
