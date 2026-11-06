# TOPLINE FLOORING & ROOFING — Next Foundation Fix Report
Date: 2026-10-01

## Executive status
This package was audited from the newly supplied Claude Code foundation. The newer work was preserved; only concrete regressions, duplicate migration definitions, stale verification contracts, and unfinished persistence boundaries were repaired.

### VERIFIED LOCALLY
- 95/95 repository verification groups passed.
- 94 active Supabase migrations.
- 94 unique migration timestamps; no duplicate active migration versions.
- Database dependency contract: 94 migrations, 151 tables, 219 statically discovered functions, 275 FK references.
- Migration integrity passed.
- Remote deployment safety static gate passed.
- Project document vault verification passed.
- Service catalogue/communications launch repair gate passed.
- Vercel/static hosting contract passed.
- No environment secret files are included in this package.

### REQUIRES LOCAL/REAL ENVIRONMENT
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build:all`
- local Supabase replay and `npm run db:types`
- linked Supabase dry-run/deployment reconciliation
- Storage/RLS real-user upload/view/delete test
- real Brevo send/webhook round trip and domain authentication
- Vercel/DNS/HTTPS/Auth redirect validation
- payment provider UAT

Dependency installation in the isolated audit workspace timed out, so no dependency-backed typecheck/lint/build result is claimed here.

## Concrete fixes
1. Removed the redundant `20260930190000_project_document_vault_360.sql` migration. The canonical project document implementation is already provided by `20260930180000_project_documents_private_storage.sql`; retaining both created duplicate table definitions and duplicate migration timestamps.
2. Preserved `20260930190000_staff_read_inactive_cms_catalog_rows.sql` as the legitimate next migration.
3. Added `20261001100000_admin_notification_state_360.sql` for per-staff server-side read/dismiss notification state.
4. Hardened the private-document overlap migration with explicit Storage RLS enablement.
5. Repaired project-document deletion to delete metadata first, then retry Storage cleanup, with an honest orphan-cleanup warning if Storage removal fails.
6. Repaired CMS loading so missing/configuration/database errors fail closed instead of silently substituting defaults.
7. Repaired CMS mutations so database persistence succeeds before the in-memory cache is updated.
8. Removed unsupported/fabricated public CMS metrics, map records and fallback office record.
9. Replaced Project Template Library browser `localStorage` persistence with the canonical `project_templates` table, while retaining source-controlled built-in templates.
10. Removed the fabricated CRM notification and browser notification persistence.
11. Added server-side persistence of staff notification read/dismiss state.
12. Hardened customer-data-export CORS to the configurable canonical Topline origin instead of wildcard CORS.
13. Removed the unreferenced `src/lib/mock-data.ts` production source artifact.
14. Updated stale project-document/deep-hardening/phase verification contracts to reflect the actual canonical implementation.
15. Updated `supabase/MIGRATION_MANIFEST.md` to the current 94-migration chain.

## Important architectural decision
The system remains on the existing Supabase/PostgreSQL + Vercel architecture. No second database, second storage bucket, or alternate persistence architecture was introduced.

## External gates
No live Supabase, Brevo, Vercel, DNS, payment-provider or Auth deployment result is being represented as verified by this package.
