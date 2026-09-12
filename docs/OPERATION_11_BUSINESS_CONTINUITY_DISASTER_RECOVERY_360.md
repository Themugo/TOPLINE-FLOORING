# Operation 11 — Business Continuity & Disaster Recovery 360

## Purpose
Create an auditable recovery-readiness control plane: critical services have recovery plans, explicit RTO/RPO targets, scheduled drills and evidence checkpoints.

## Recovery lifecycle

`Identify critical service → Define RTO/RPO → Document recovery procedure → Schedule drill → Execute/test → Record outcome → Capture evidence → Review` 

## Security boundary

- Recovery tables are RLS-enabled and have no direct authenticated table privileges.
- Mutations are RPC-only and require the existing `settings:update` staff permission.
- Read access is exposed through `get_business_continuity_360()` with `reports:select` authorization.
- No service-role key or provider credential is exposed to the browser.

## Evidence boundary

A checkpoint is an application record pointing to evidence. It is **not** proof that a managed provider completed a backup or restore. Supabase PostgreSQL backups, Vercel recovery, payment-provider recovery and messaging-provider continuity remain external controls.

## UAT

1. Authorized staff can create a continuity plan with valid RTO/RPO and recovery procedure.
2. Unauthorized users cannot invoke plan, drill or checkpoint mutation RPCs.
3. A Tier 1 plan appears in the continuity console.
4. A drill can be scheduled and completed with an outcome.
5. Recovery evidence can be attached as a checkpoint reference.
6. Needs-review and due-drill metrics reflect the underlying records.

## Recovery discipline

- Never run `supabase db reset --linked` against production.
- Execute restore/failover drills only in an authorized disposable or approved recovery environment.
- Preserve provider-generated evidence and incident references rather than inventing application-side success.
- Failed drills become improvement work and should be tied to an incident or corrective action where appropriate.
