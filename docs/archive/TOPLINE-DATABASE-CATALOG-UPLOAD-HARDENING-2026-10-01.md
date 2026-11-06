# TOPLINE DATABASE — CATALOG / PRODUCT / SERVICE / UPLOAD HARDENING

Date: 2026-10-01

## Status

**STATIC HARDENING GATE: PASSED**

- Verification groups: **96/96 passed**
- Active migrations: **95**
- Migration timestamps: unique
- Tables: 151 (static dependency contract)
- Statically discovered functions: 219
- FK references: 275

## Scope

This hardening pass preserves the existing Supabase/PostgreSQL architecture and strengthens the canonical database boundaries used by:

- Products
- Product variants
- Product gallery images
- Product specifications
- Product documents
- Services
- Service images
- Media Library uploads
- Public `images` storage
- Private project-document uploads
- Project images
- Inventory-backed product stock

No second database, second storage system, or unrelated feature was introduced.

## Database hardening implemented

### Products

- Sale price cannot exceed the canonical product price.
- Display ordering cannot be negative.
- Low-stock threshold cannot be negative.
- Product image lookup is indexed.

### Product variants

- Sale price cannot be negative.
- Cost price cannot be negative.
- Display ordering cannot be negative.

### Product media

- Product image display ordering cannot be negative.
- Product specifications/document ordering cannot be negative.
- A product can have **at most one primary gallery image** through a partial unique index.
- Product image/specification/document access patterns are indexed.

### Services

- Base service price cannot be negative.
- Service duration cannot be negative.
- Display ordering cannot be negative.
- Service code lookup is indexed.
- Existing canonical service slug/content contract is preserved.
- Service image URLs remain compatible with the existing upload path.

### Media Library

- Media filenames cannot be blank.
- Stored file size must be positive and cannot exceed 10 MiB.
- Stored dimensions, when supplied, must be positive.
- `is_public` is now non-null with a default of true.
- Folder/time and public/time indexes added.

## Storage hardening

### Public `images` bucket

Explicit database storage configuration now matches the application contract:

- Public bucket retained.
- 10 MiB absolute storage ceiling.
- Allowed MIME types:
  - JPEG
  - PNG
  - WebP
  - GIF
  - AVIF
- Existing frontend upload guard remains stricter at 5 MiB.
- Existing `upsert=false` behavior is preserved.
- Existing media/catalog permission boundary remains intact.

### Private `private-documents` bucket

Explicit storage configuration now matches `project_documents`:

- Private bucket.
- 10 MiB absolute ceiling.
- PDF, JPEG, PNG, WebP, TXT, DOCX and XLSX only.
- Existing project-scoped RLS and signed-download workflow preserved.

## Verification

The complete repository verification suite passes:

`96/96 passed, 0 failed.`

The new dedicated verifier checks the database/storage/application contract across:

- upload MIME alignment
- storage ceilings
- product pricing integrity
- product gallery primary-image integrity
- service pricing/duration integrity
- media metadata integrity
- product upload path
- service upload path
- storage authorization

## Important remaining runtime gate

Static verification does not prove that the linked Supabase database has successfully applied migration `20261001110000_catalog_product_service_upload_integrity_360.sql`.

Before production deployment:

1. Replay the full migration chain against the local/staging Supabase database.
2. Run `npm run db:types`.
3. Run typecheck, lint and production build.
4. Run the Services + Upload + Installation E2E test.
5. Perform the linked Supabase dry-run/review.
6. Apply migrations only after the dry-run is clean.
7. Test actual product image upload, service image upload, media-library upload and private project-document upload with real authenticated staff roles.

No external production UAT is claimed by this report.
