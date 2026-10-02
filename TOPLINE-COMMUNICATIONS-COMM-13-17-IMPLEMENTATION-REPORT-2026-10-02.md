# TOPLINE Communications COMM-13–17 Implementation Report

## Scope
Continued from the canonical TOPLINE database source-of-truth package through COMM-12.

## Implemented
- COMM-13: canonical certification evidence ledger for two-customer isolation/UAT.
- COMM-14: canonical communications incident ledger for failure, retry and recovery evidence.
- COMM-15: release/operations observability uses database-backed worker, queue, unknown-delivery and incident metrics.
- COMM-16: security certification evidence is recorded in the database and required by the release gate.
- COMM-17: fail-closed communications release gate requires clean worker/queue state, no open critical incidents, provider readiness, staging security certification and two-customer UAT certification.

## Database changes
Migration: `20261002180000_communications_comm_13_17_certification_observability_release_360.sql`

New canonical tables:
- `communication_certification_runs`
- `communication_incident_events`

New protected RPCs:
- `record_communication_certification_360`
- `record_communication_incident_360`
- `get_communications_release_gate_360`

No provider credentials are stored in PostgreSQL. Provider secrets remain Edge environment secrets.

## Verification
- Database source-of-truth: PASS — 107 migrations.
- COMM-13–17 static sweep: PASS.
- COMM-10–12 regression: PASS.
- Migration integrity: PASS.
- Database dependencies: PASS — 107 migrations, 160 tables, 236 functions, 285 FK references.

## Deployment limitation
The live Supabase database has not been marked deployed from this package. The earlier Supabase pooler transport/TLS timeout remains an external deployment gate. Real provider UAT and browser build/typecheck certification must be run against the deployed environment.
