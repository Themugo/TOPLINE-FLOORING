# TOPLINE FLOORING & ROOFING — DEEP HARDENING REPORT

## Baseline
Source audited: `TOPLINE-FLOORING-main-HARDENED-2026-09-30.zip`.

## Implemented fixes

### 1. Private document Storage policy overlap — HIGH
The earlier private-document migration granted broad access through `media.*` permissions and customer-portal checks across the entire `private-documents` bucket. The project-document migration added policies but did not revoke those earlier policies.

Implemented migration:
`supabase/migrations/20260930193000_private_document_policy_overlap_hardening.sql`

Changes:
- drops the four legacy broad policies;
- scopes project-document SELECT/UPDATE/DELETE to `project_documents` metadata;
- keeps project-scoped INSERT path validation;
- preserves the private bucket.

### 2. Customer export CORS
`supabase/functions/customer-data-export/index.ts` no longer uses wildcard `Access-Control-Allow-Origin: *`.

It now uses `TOPLINE_WEB_ORIGIN` with the canonical production origin as the fallback.

### 3. Project document deletion
`ProjectDocumentManager.tsx` now removes database metadata before Storage cleanup and retries Storage cleanup once. This avoids leaving a database record pointing at a deleted object. If Storage cleanup still fails, the UI reports the exact cleanup state rather than claiming full success.

### 4. Regression gate
Added:
`scripts/verify-deep-hardening.mjs`

Added package command:
`npm run verify:deep-hardening`

## Verified in audit workspace
- Deep hardening static gate: PASS
- Migration integrity: PASS
- Schema contract: PASS
- Active migrations: 91
- No active source imports of `src/lib/mock-data.ts` detected.

## Not falsely certified
The audit workspace does not contain installed dependencies or a linked Supabase local database, so these were not claimed as executed here:
- `npm run verify:all`
- `npm run db:types`
- `npm run typecheck`
- `npm run lint`
- `npm run build:all`
- real Supabase Storage/RLS identity tests
- real Brevo delivery
- Vercel/DNS/HTTPS/Auth UAT

## Remaining next-stage items
1. Generate and commit real Supabase database types after schema replay.
2. Decide and implement canonical persistence for admin notifications instead of localStorage.
3. Decide and implement canonical persistence for operational project templates instead of localStorage.
4. Browser/E2E authorization tests for project/document/customer boundaries.
5. Webhook replay/idempotency runtime tests.
6. Real customer-data-export origin and authorization test.
7. Real CSP/browser request validation.
8. Production/UAT certification.
