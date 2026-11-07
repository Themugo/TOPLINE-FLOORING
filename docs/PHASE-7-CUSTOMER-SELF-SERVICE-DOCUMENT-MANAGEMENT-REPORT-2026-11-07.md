# Phase 7 — Customer Self-Service & Document Management Audit Report

**Date:** 2026-11-07  
**Authoritative foundation:** `TOPLINE-FLOORING-PHASE-06-COMPLETE-2026-11-07.zip`  
**Project root preserved:** `TOPLINE-FLOORING-main/`  
**Status:** Source-level repairs complete; staging and live customer-role certification pending.

## Scope and approach

Phase 7 continued directly from the Phase 6 ZIP. Existing customer portal, `project_documents` metadata table, `private-documents` bucket, customer document RPCs, staff project-document manager, and customer account flows were retained. No second document table or bucket was introduced. Existing order, payment, quotation, invoice, refund, inventory and fulfilment work was preserved.

## Findings and repairs

### P7-01 — Customer project documents were not available in the portal

The portal displayed legacy `customer_documents` metadata but did not expose the canonical `project_documents` vault. The project vault's metadata and Storage access policies were staff-only.

**Repair:** Added a customer read-only RLS policy based on a private `SECURITY DEFINER` ownership predicate, `private.customer_owns_project(uuid)`, with an empty search path. Added `public.get_customer_project_documents()` which derives the customer identity from the authenticated portal mapping and returns only documents attached to projects owned by that customer. The RPC exposes metadata and a private storage path, not a public URL or staff identity. The portal now displays the project documents and opens them using a 60-second signed URL from the existing private bucket. Storage RLS remains the authorization boundary when the signed URL is requested.

### P7-02 — Customer Storage object rename could escape its owner path

The prior `Topline private documents update` policy checked ownership in `USING`, but its `WITH CHECK` only enforced the bucket and non-project prefix. An authenticated customer could therefore update an object they owned and attempt to move its destination path into another customer's folder.

**Repair:** Replaced the policy so both `USING` and `WITH CHECK` require the authenticated customer to own the first path segment, unless the actor holds the existing `media.update` permission. Active portal access is required. Project document paths remain excluded from this customer-document policy and continue through the project-specific policies.

### P7-03 — Customer project ownership must not depend on direct project table access

A direct subquery against `projects` in a metadata RLS policy could be affected by the separate `projects` table's own RLS visibility.

**Repair:** Added `private.customer_owns_project(uuid)` as a narrowly scoped, fixed-search-path helper. It resolves the project owner under a privileged context while comparing against `public.get_current_customer_id()`. Execute is revoked from PUBLIC/anon and granted only to authenticated users. Customer project-document access remains SELECT-only.

## Files changed or added

- Added `supabase/migrations/20261107130000_customer_document_access_hardening.sql`.
- Updated `src/lib/customer-self-service.ts` with project-document retrieval and short-lived signed URL helper.
- Updated `src/pages/portal.tsx` with a responsive project-document list and open action.
- Updated `src/types/database.ts` with the new RPC type.
- Updated `supabase/tests/browser_rpc_grants.sql` using the repository's RPC grant-test generator.
- Updated `supabase/MIGRATION_MANIFEST.md` (154 active migrations).
- Updated `docs/MASTER-WORKFLOW-REGISTER.json` (Phase 7 and 157/157 aggregate static checks).
- Added `scripts/verify-phase-7-customer-self-service-documents.mjs` and its package script.
- Added this report.

## Verification results

- Phase 7 targeted assertions: **21/21 passed**.
- Existing project-document verifier: passed.
- Existing project-document vault verifier: passed.
- Existing customer self-service verifier: passed.
- Customer self-service RPC trust-boundary verifier: **14/14 passed**.
- Phase 4 regression verifier: **22/22 passed**.
- Phase 5 payment atomicity verifier: **18/18 passed**.
- Phase 6 finance/refund verifier: **20/20 passed**.
- Migration integrity: passed; 154 active migrations with unique timestamps.
- SQL runtime safety: passed.
- Full aggregate static suite: **157/157 passed, 0 failed** (`node scripts/verify-all.mjs`).
- RPC grant-test artifact regenerated for 162 RPCs.

## Not performed / release gates

- Root `node_modules` is absent in this archive; no dependency installation was performed. Therefore TypeScript typecheck, ESLint, Vite production build and browser bundle checks were not run.
- No disposable or staging PostgreSQL migration replay was performed.
- No real customer/staff/anonymous/service-role RLS matrix was executed against Supabase.
- No Storage API test confirmed upload, rename, signed URL, cross-customer denial, deletion, or metadata/file consistency with live roles.
- No real customer portal browser/device test was run on desktop or mobile.
- No production database, customer data, storage object, provider, or live deployment was modified.

## Staging acceptance checklist

1. Replay the migration on a disposable database, then reconcile it against the dedicated staging project before deployment.
2. Confirm a customer can list and download documents attached to their own projects.
3. Confirm the same customer cannot list or download another customer's project documents.
4. Confirm customer access is read-only: metadata insert/update/delete and project-document upload/delete are denied.
5. Confirm a customer cannot rename or update a private object into another customer's path; staff with `media.update` retains its intended management capability.
6. Confirm staff `projects.select` access and existing media-management access remain intact.
7. Confirm signed URLs expire as expected and never use the public bucket/public URL route.
8. Exercise the portal at mobile and desktop widths, including empty, loading, denied and temporary-error states.

**Phase 7 conclusion:** Customer project-document visibility and private download flow are implemented at source level, and the customer Storage path-ownership gap is closed in the migration. This is not a claim of staging, provider, browser, or production certification. Phase 7 ZIP is the next authoritative foundation only after the owner accepts this source-level checkpoint; do not deploy automatically.
