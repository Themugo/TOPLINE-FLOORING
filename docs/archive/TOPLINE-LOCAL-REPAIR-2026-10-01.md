# TOPLINE FLOORING & ROOFING — Local Repair Note

## What the supplied Windows verification log showed

The local working tree had two concrete regressions that were not present in the current 95-migration audit package:

1. `src/components/admin/AdminNotificationCenter.tsx` referenced `supabase` without importing it and relied on an untyped notification-state result.
2. A redundant migration named `20260930190000_project_document_vault_360.sql` had reappeared beside the canonical `20260930180000_project_documents_private_storage.sql` migration. This created duplicate migration timestamps and duplicated the `project_documents` table definition.

The canonical package already contains the correct repair for #2: `20260930190000_staff_read_inactive_cms_catalog_rows.sql` is the only migration allowed to use the `20260930190000` timestamp.

## Required local action

In the Windows project, remove only this redundant local file if it exists and has not been intentionally deployed as a separate remote migration:

`supabase\migrations\20260930190000_project_document_vault_360.sql`

Do **not** rename it to another timestamp. It duplicates the canonical project-document implementation and must not remain in the active migration chain.

If that exact migration has already been applied to a remote Supabase project, stop before deleting/rewriting migration history and reconcile the remote migration history first. Never use `supabase db reset --linked` against production.

## Expected migration state after repair

- Active migrations: 95
- Unique migration timestamps: 95
- `20260930180000_project_documents_private_storage.sql`: canonical project document table/storage implementation
- `20260930190000_staff_read_inactive_cms_catalog_rows.sql`: canonical 20260930190000 migration
- `20260930193000_private_document_policy_overlap_hardening.sql`: subsequent hardening
- Final migration: `20261001110000_catalog_product_service_upload_integrity_360.sql`

## Verification order

Run from the project root:

```cmd
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
```

Then, only against the intended staging/deployment target:

```cmd
supabase db push
npm run verify:live-catalog-schema
npm run test:e2e:services-installation
npm run db:types
```

The live `services.slug` failure reported previously is a database deployment-state issue, not an application contract to remove. Apply the migration chain before rerunning the live E2E.
