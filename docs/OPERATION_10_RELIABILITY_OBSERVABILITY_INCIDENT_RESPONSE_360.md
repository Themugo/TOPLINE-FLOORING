# Operation 10 — Reliability, Observability & Incident Response 360

## Purpose

Provide a durable operational response layer after production certification: incidents have severity, domain, ownership, timestamps, response state and resolution evidence. This is an operational register, not a replacement for infrastructure/provider monitoring.

## Incident lifecycle

`Open → Investigating → Mitigated → Resolved`

Critical/high incidents should have an owner and a documented resolution before closure. Resolved incidents cannot be silently reopened through the application RPC.

## Security boundary

- `operational_incidents` is RLS-enabled and has no direct authenticated table privileges.
- Creation and state mutation are RPC-only.
- Incident creation/update requires the existing `settings:update` staff permission.
- Read access is through the protected `reports:select` snapshot RPC.
- No service-role key or provider credential is exposed to the browser.

## Monitoring boundary

The incident console does **not** claim that Vercel, Supabase, DNS, payment providers, Brevo, Africa's Talking, WhatsApp, SMTP or other external services are healthy. Those systems still require their own monitoring and provider-side evidence.

## UAT

Before production launch, test at minimum:

1. Authorized manager/admin can record an incident.
2. Unauthorized/non-staff users cannot invoke incident mutation RPCs.
3. Critical incident appears in the reliability console.
4. Incident can move through investigation and mitigation.
5. Resolution requires a summary and records a resolved timestamp.
6. Existing executive and system-health dashboards continue to load.

## Rollback

If Operation 10 must be rolled back before production deployment, do not reset the production database. Remove the unreleased migration from the release candidate only before applying it remotely. If already deployed, use a reviewed forward migration rather than destructive rollback.

## Release evidence

Run the complete local Supabase replay and CI suite. Then perform the authorized linked Supabase dry-run, review the migration list, and only then apply migrations. External provider and business UAT remain separate evidence requirements.
