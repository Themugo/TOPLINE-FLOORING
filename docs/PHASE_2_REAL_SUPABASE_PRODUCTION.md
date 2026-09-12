# Phase 2 — Real Supabase Production Infrastructure

## Objective

Prepare the canonical Topline database for production use with explicit RLS, storage boundaries, Auth identity rules, migration discipline and a real backup/recovery operating model.

## Production architecture

- **Supabase PostgreSQL** — system of record.
- **Supabase Auth** — staff/customer identity; Topline does not store passwords.
- **Supabase Storage** — public-read product/site images with authenticated staff write controls.
- **RLS** — database-level authorization boundary.
- **RPCs** — transactional business mutations.
- **Git migrations** — source-controlled schema authority.
- **Operational export** — staff-controlled recovery/handoff export already provided by the application.
- **Supabase platform backups** — primary database disaster-recovery layer; exact retention/PITR depends on the subscribed Supabase plan and must be verified in the production project before launch.

## RLS decision

The canonical schema previously had RLS on only a subset of tables. Phase 2 closes that gap by enabling RLS across the remaining application surfaces.

Public read access is limited to intentionally public catalogue/content records. Public writes are limited to lead, quotation and contact intake plus the existing page-visit telemetry. Business transactions such as orders, payments, inventory and project mutations remain authenticated/permission-controlled or RPC-controlled.

## Storage decision

The `images` bucket is public-read because the public website needs product/project imagery. Upload, update and delete operations require authenticated Topline staff with `media` or `catalog` permissions.

Do **not** use the previous permissive `supabase/setup_storage.sql` in production. Its anonymous write/update/delete policies are intentionally superseded by the canonical Phase 2 migration.

## Auth production checklist

1. Create/verify the production Supabase project.
2. Configure the production Site URL to the real Topline domain.
3. Configure allowed redirect URLs for the customer and staff portals.
4. Keep email/password or magic-link flows under Supabase Auth; no custom password table.
5. Configure production SMTP before enabling customer/staff email flows at scale.
6. Disable or remove development redirect URLs from production.
7. Create the first owner/staff identity through the controlled bootstrap process.
8. Verify customer identity binding against `customer_portal_access`.

## Database deployment gate

Never blindly push the complete migration directory to the production project.

Required order:

```text
local replay / lint / security tests
        ↓
production migration-history inspection
        ↓
dry-run / reconciliation
        ↓
explicit production approval
        ↓
production migration deployment
        ↓
post-deploy advisors + smoke tests
```

The current ChatGPT-connected Supabase project is `jypkhvknfgoqrhwzbdwi`, but this environment currently lacks permission to inspect or mutate that project through the connected Supabase control plane. Therefore Phase 2 source changes are prepared, but **no production migration is claimed as deployed**.

## Backups and recovery

Topline needs two recovery layers:

### Layer A — Supabase platform backup

Use the production Supabase plan's managed PostgreSQL backups/PITR where available. Confirm the exact retention and restore capabilities in the project's Backup settings before launch.

### Layer B — Topline operational export

Retain periodic application-level JSON exports for business handoff/recovery. These are complementary to database backups; they are not a replacement for PITR or full database restore.

Recommended cadence after launch:

- daily automated/controlled export while transaction volume is low;
- weekly retained export;
- monthly offline/archive copy;
- restore rehearsal at least quarterly.

Never store exports in a public bucket.

## Secrets

Never commit:

- Supabase service-role key
- SMTP password
- email API key
- SMS API key
- payment secrets
- database password
- cPanel password
- DNS API tokens

Browser variables may contain only the Supabase URL and publishable/anon key required by the client SDK.

## Production smoke tests

After real deployment, verify:

- anonymous public catalogue read works;
- anonymous business-data reads are denied;
- anonymous lead/quote/contact intake works;
- anonymous order creation is possible only through the intended RPC contract;
- authenticated customer can see only their own portal data;
- staff without a permission cannot access protected data;
- owner/admin can operate required business modules;
- storage images are publicly readable;
- anonymous storage writes are denied;
- authorized media/catalog staff can upload/update/delete images;
- payment data is not exposed to unauthorized roles;
- audit records are not publicly readable;
- backup/export works;
- restore procedure is documented and tested.
