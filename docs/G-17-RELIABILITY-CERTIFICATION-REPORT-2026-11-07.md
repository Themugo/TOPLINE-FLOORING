# G-17 — Reliability certification report

**Foundation:** `TOPLINE-FLOORING-G-16-PROJECT-DELIVERY-CERTIFICATION-2026-11-07.zip`  
**Scope:** reliability incident register, read-failure handling, operational status presentation, payment webhook reconciliation, communication provider response and delivery worker hardening.

## Audit findings and repairs

### R-01 — Incident data failure could look like an empty incident register
The reliability page retained only a generic message on read failure. The incident panel's empty-state branch could display "No open incidents recorded" when there was no successful snapshot. KPI cells also defaulted missing metrics to zero after loading stopped. This could misrepresent unavailable telemetry as a healthy zero count.

**Repair:** Added explicit `loadError` state, persistent alert with retry, unavailable placeholders for KPI values when no successful snapshot exists, and an empty state that only appears after a successful read.

### R-02 — System health headline overstated scope
The System Health page labelled a successful database snapshot "Platform operational", although the snapshot is not an end-to-end check of hosting, auth, payment providers, email, SMS, webhooks or customer workflows.

**Repair:** Changed the headline to "Database health snapshot available" and clarified that the RPC response does not certify external providers or every application workflow. No new health signals were invented.

## Verification
- G-17 focused source verifier: 12/12.
- Operation 10 reliability/incident response verifier: passed.
- Operation 9 production certification verifier: passed.
- Payment webhook reconciliation verifier: passed.
- Phase 18–20 communications provider response verifier: passed.
- Delivery worker hardening verifier: passed.

These are source/static checks. No live telemetry, external provider, synthetic transaction, alert delivery or incident paging test was performed in this environment.

## Remaining staging/live acceptance
G-17 remains **OPEN** until:
1. Staging can demonstrate health snapshot behavior under database success, partial failure and outage.
2. External uptime/latency/error monitors are configured for hosting, Supabase, DNS, payments, email and SMS, with owners and thresholds.
3. Synthetic checkout, webhook, transactional email and scheduled-worker checks produce measured results.
4. Critical/high alerts reach the designated on-call recipients and escalation path.
5. Incident creation, assignment, mitigation, resolution and audit evidence pass authorized/unauthorized role tests.
6. A controlled fault injection confirms detection, alerting, recovery and no false green state.

No production data, external monitoring configuration, DNS, provider account, deployment, Git commit or push was changed.

## Windows CMD
```cmd
npm ci
npm run verify:g17-reliability
npm run test:g17-reliability
```
Keep secrets and customer identifiers out of logs and chat. Capture staging timestamps, monitor IDs, alert delivery evidence and sanitized incident references.
