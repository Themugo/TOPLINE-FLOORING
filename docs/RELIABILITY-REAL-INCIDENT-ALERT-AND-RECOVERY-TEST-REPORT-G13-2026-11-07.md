# Reliability — Real Incident Alerts and Recovery Test Report

**Foundation:** G-13-derived project delivery UAT package, continued without changing the project root.

**Decision: OPEN / NO-GO for production reliability certification.** Source contracts pass. Real provider alert delivery, isolated restore, Storage recovery and measured RTO/RPO have not been executed in this environment.

## Audit findings

1. The existing Operation 10 incident register provides durable incident records, permission-gated RPCs, row-locked updates and lifecycle timestamps.
2. The reliability console is not an infrastructure monitoring service. The reviewed source does not establish end-to-end alert ingestion or dispatch from Supabase, Vercel, DNS, payment providers or messaging providers. Provider-side alert routing must be tested independently.
3. The current incident schema/RPC does not enforce an owner for every critical/high incident. The UI/runbook states that these incidents should have an owner, but this remains an operational policy rather than a database-enforced invariant. This is recorded as a gap; no retroactive migration was added without reviewing existing incident rows and ownership policy.
4. Existing G-11.1/G-23 recovery documentation requires isolated database restore, separate Storage object restore, integrity checks and measured RTO/RPO. No provider restore evidence was present, so no restore was attempted and no RTO/RPO is claimed.

## Changes delivered

- Added a staging-only incident alert and recovery evidence validator: `scripts/validate-reliability-incident-uat.mjs`.
- Added a 20-assertion source contract verifier: `scripts/verify-reliability-incident-uat.mjs`.
- Added npm commands `uat:reliability-incident` and `verify:reliability-incident-uat`.
- Registered the source contract and validator syntax checks in CI.
- Added a sanitized evidence template and detailed staging execution runbook.
- Validator refuses to run without explicit staging mode and opt-in, rejects the canonical production project ref, requires provider alert references and ordered lifecycle timestamps, requires database and Storage recovery plus business smoke-test confirmations, checks measured versus approved RTO/RPO, scans for likely secret leakage, hashes the evidence file and labels its output `EVIDENCE_VALIDATED_NOT_INDEPENDENTLY_VERIFIED`.

## Verification performed

| Check | Result |
|---|---:|
| New reliability incident source contract | PASS — 20 checks |
| Existing Operation 10 incident response verifier | PASS |
| G-11.1 disaster recovery source verifier | PASS — 21 checks |
| New evidence runner syntax | PASS |
| New verifier syntax | PASS |
| Evidence runner without staging opt-in | PASS — blocked with exit code 2 |
| Full repository static verification | PASS — 191/191, 0 failed |
| Migration chain | Unchanged — 165 active migrations |
| ZIP integrity | PASS |

The G-23 evidence validator was not counted as a passing live drill: when run directly it correctly reported BLOCKED because no real provider drill evidence file exists. The aggregate static verifier intentionally excludes this evidence-only gate.

## Not executed

- No staging provider alert was triggered or received.
- No real notification channel delivery was independently inspected.
- No database restore or Storage object restore was executed.
- No live RLS/permission negative tests or business smoke tests were run against a staging database.
- No measured RTO/RPO is available.

## Safety boundary

No production outage/fault injection, database restore/reset, DNS cutover, provider alert route change, webhook change, payment or messaging action, deployment, Git commit or push was performed. No production data was modified. The active migration chain is unchanged.

## Required closure

An authorised operator must execute the staging runbook, capture provider-generated alert and restore evidence, validate database and Storage independently, calculate RTO/RPO against targets approved in advance, and obtain independent observer/business-owner sign-off. Critical/high unassigned incidents must be addressed or formally accepted as a policy exception before production certification.
