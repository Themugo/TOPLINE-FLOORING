# TOPLINE FLOORING & ROOFING — NEXT DEEP AUDIT

## Baseline
Audited from `TOPLINE-FLOORING-main-HARDENED-2026-09-30.zip`.

## Implemented in this pass
- Removed the legacy broad `private-documents` Storage policies that overlapped the project-document vault.
- Scoped project-document Storage SELECT/UPDATE/DELETE to metadata represented in `public.project_documents`.
- Kept project-scoped INSERT path enforcement.
- Tightened `customer-data-export` CORS from wildcard to `TOPLINE_WEB_ORIGIN`, defaulting to the canonical production origin.
- Changed project document deletion to remove metadata first and perform bounded Storage cleanup retries, avoiding dangling database references.
- Added `verify:deep-hardening` regression checks.

## Findings deliberately not fabricated
- Generated Supabase types cannot be truthfully generated without a usable local/linked database. Run `npm run db:types` in the actual development environment after schema replay.
- Admin notifications and project templates still contain browser persistence. They require a business-contract decision before inventing new tables; this remains a next-stage task.
- Real Supabase RLS/Storage isolation, Brevo delivery, Vercel/DNS, Auth redirects and provider UAT require the real environment.

## Validation
Run in the real repository:

```cmd
npm ci
npm run verify:deep-hardening
npm run verify:all
npm run typecheck
npm run lint
npm run build:all
```

## External certification still required
- Apply migrations to Supabase.
- Verify Storage policies with separate authorized/unauthorized identities.
- Generate and inspect DB types.
- Verify customer export from the deployed origin.
- Test real Brevo delivery/webhooks.
- Verify Vercel/DNS/HTTPS/Auth redirects.
