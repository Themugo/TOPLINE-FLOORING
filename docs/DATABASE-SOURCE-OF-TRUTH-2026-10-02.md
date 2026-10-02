# TOPLINE Database Source of Truth — 2026-10-02

## Canonical authority
PostgreSQL/Supabase is the canonical persistence and schema authority for TOPLINE FLOORING & ROOFING.

The authoritative schema change history is the ordered set of files under `supabase/migrations/`. The remote database migration history is tracked by Supabase in `supabase_migrations.schema_migrations`.

MongoDB is not the canonical persistence layer. Redis is not a source-of-truth database; it remains an operational/staging dependency.

## Current migration chain
- Migration files: 106
- Latest migration: `20261002170000_communications_comm_10_12_conversations_scheduler_activation_360.sql`
- Latest communications migration: `20261002170000_communications_comm_10_12_conversations_scheduler_activation_360.sql`
- Customer registration/dashboard migration: `20261002130000_customer_registration_and_reconciliation_360.sql`
- COMM-01–03: `20261002140000_communications_comm_01_03_contract_state_matching_360.sql`
- COMM-04–06: `20261002150000_communications_comm_04_06_provider_templates_routing_360.sql`
- COMM-07–09: `20261002160000_communications_comm_07_09_customer_admin_360.sql`
- COMM-10–12: `20261002170000_communications_comm_10_12_conversations_scheduler_activation_360.sql`

## Current static dependency snapshot
- 158 tables
- 233 functions
- 282 foreign-key references
- 106 ordered migrations

These are static repository-derived counts, not a claim about the currently deployed remote database.

## Deployment rule
Apply migrations forward with `supabase db push`. Do **not** use `supabase db reset --linked` against production.

Supabase documents that `db push` applies migrations not already recorded in the remote migration history table. The recommended production workflow is to link the project, perform a dry run, then push. citeturn0search3

## Provider rule
Provider credentials remain Edge environment secrets. They are intentionally not stored in PostgreSQL. The database stores provider contracts/readiness metadata, not secret values.

## Required post-deployment certification
1. `supabase db push --dry-run`
2. `supabase db push`
3. `npm run verify:communications-comm-10-12`
4. `npm run verify:migration-deployment-static`
5. `npm run verify:database-dependencies`
6. Generate fresh database types from the live Supabase schema.
7. Run live customer-isolation and communication UAT.
8. Run provider webhook/delivery UAT for Brevo, Africa's Talking and Meta WhatsApp.

## Network note
The project previously encountered a Supabase pooler TLS timeout. If the standard connection continues to time out, the current Supabase CLI documentation supports `--skip-pooler` on the beta CLI for direct database connection, subject to IPv6/network support. citeturn0search1turn0search0

## Migration integrity manifest
The complete per-file SHA-256 manifest is in `docs/DATABASE-MIGRATION-SHA256-2026-10-02.txt`.
