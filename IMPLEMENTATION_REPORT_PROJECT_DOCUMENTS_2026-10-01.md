# Implementation Report — Project Documents & Fake-Behaviour Removal (2026-10-01)

## Done
- **Priority 3 – Project document management (complete, locally verified)**
  - New additive migration `20260930180000_project_documents_private_storage.sql` (migration #90): `public.project_documents` table, RLS using `private.current_user_has_permission('projects', select|insert|update|delete)`, audit trigger (`private.audit_log_change`), `touch_updated_at` trigger, path-scope CHECK (`projects/<project_id>/...`), anon revoked.
  - Additive storage policies on the EXISTING `private-documents` bucket for the `projects/` prefix only. No new bucket; existing media/customer-portal policies untouched.
  - `ProjectDocumentManager.tsx` rewritten: real upload, DB reads, 60-second signed URLs for view/download, delete of storage object + metadata, orphan rollback on failed insert, type/size validation matching the bucket (10 MB, allowed MIME list). No localStorage, no sample/dummy data.
  - `ProjectDocument` type now mirrors the table.
  - New verifier `scripts/verify-project-documents.mjs` (`npm run verify:project-documents`, picked up by `verify:all`); manifest updated.
- **Priority 4 – Fake behaviour removed**
  - Header/Footer no longer fabricate `+1 (555)…`, `contact@example.com`, or a fake address; fields render only when configured in site settings.
  - `AdminNotificationCenter`: removed "Dispatch Alert Email" that toasted success without sending anything.
  - Deleted unreferenced `src/lib/mock-data.ts`.

## Not done / not audited in this session
- **Priority 1 (service catalogue end-to-end)**: not audited beyond the baseline verifier.
- **Priority 2 (Brevo/communications)**: not audited. Team-alert email needs a real staff-alert outbox path (existing `queue_customer_message` requires a customer id); not built.
- Remaining localStorage: `ProjectTemplateLibrary` (templates saved only in browser; should move to DB), notification read/dismiss state, cart, search history, recently viewed (UI conveniences, acceptable).
- Portfolio hard-coded headline metrics still need owner approval.

## Checks (local)
| Check | Result |
|---|---|
| `npm run verify:all` | 90/90 passed, 0 failed |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run build:all` | pass |
| `npm run db:types` | NOT run (needs linked DB) |
| Secrets scan (src, supabase, .env.example, vercel.json) | none found |

## External gates still PENDING (not validated)
Migration #90 applied to live Supabase; storage policies tested with a real staff and non-staff user; real upload/signed-URL/delete round trip; `db:types` regeneration; Brevo domain auth + real delivery + webhooks; Auth redirects; Vercel env vars, DNS, HTTPS, canonical redirect; payment provider UAT.

## Commit/push (cmd)
```
cd "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git status
git add supabase/migrations/20260930180000_project_documents_private_storage.sql supabase/MIGRATION_MANIFEST.md scripts/verify-project-documents.mjs package.json src/lib/types.ts src/components/admin/ProjectDocumentManager.tsx src/components/admin/AdminNotificationCenter.tsx src/components/layout/Header.tsx src/components/layout/Footer.tsx IMPLEMENTATION_REPORT_PROJECT_DOCUMENTS_2026-10-01.md
git rm --ignore-unmatch src/lib/mock-data.ts
git commit -m "Project documents on private-documents bucket; remove fake operational behaviour"
git push origin main
```
