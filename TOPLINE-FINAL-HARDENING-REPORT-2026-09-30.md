# TOPLINE FLOORING & ROOFING — Final Local Hardening Report

Date: 2026-09-30
Baseline: `20260930170000_service_catalog_and_communications_worker_hardening.sql`
New migration: `20260930190000_project_document_vault_360.sql`

## Work completed

1. Replaced the fake admin Project Document Vault implementation.
   - Removed sample documents.
   - Removed W3C dummy PDF URLs.
   - Removed localStorage business persistence.
   - Added real Supabase `project_documents` persistence.
   - Added upload to the existing private `private-documents` bucket.
   - Added project-scoped storage paths.
   - Added MIME type and byte-size metadata.
   - Added authenticated user attribution.
   - Added temporary signed URLs for viewing/downloading.
   - Added deletion of the stored object and metadata record.

2. Added database/RLS controls.
   - `project_documents` references `projects`.
   - Staff project permissions control SELECT/INSERT/UPDATE/DELETE.
   - Storage access remains private.
   - Project document storage paths are constrained to the project UUID prefix.
   - Existing audit trigger mechanism records document mutations.
   - Existing `private-documents` bucket is reused; no second storage architecture was introduced.

3. Added a dedicated regression verifier:
   - `scripts/verify-project-document-vault.mjs`
   - `npm run verify:project-document-vault`

4. Refreshed the migration manifest from 89 to 90 active migrations.

## Verification

- Project document vault verifier: PASS
- Full cumulative verification suite: **90/90 passed, 0 failed**
- Active migration count: 90
- Unique migration timestamps: PASS
- Database dependency verification: PASS
- Service catalogue repair: 17/17 PASS
- Brevo/email architecture verifier: 14/14 PASS
- Vercel/static deployment verification: PASS
- Typecheck/lint/build could not be executed in this isolated handoff environment because the packaged dependency tree did not contain the TypeScript executable. Run them in the local repository after copying this package and running `npm ci`.

## External launch gates still require the real environment

These cannot honestly be certified from the source ZIP:

- Apply the 90 migrations to the dedicated Supabase project.
- Run `npm run db:types` after successful database replay.
- Verify `private-documents` bucket policies against the deployed database.
- Upload/view/delete a real project document using an authenticated staff account.
- Verify Brevo sender/domain authentication and deliver a real transactional email.
- Verify Supabase Auth email delivery and redirects.
- Verify Vercel production deployment, DNS, HTTPS and canonical host redirect.
- Complete payment/provider UAT where applicable.

## Safety boundary

No Git history was reset, no force-push is required, no provider secret was added, and no existing business architecture was replaced.
