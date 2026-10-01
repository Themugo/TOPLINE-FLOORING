# CLAUDE CODE MASTER CONTINUATION PROMPT — TOPLINE FLOORING & ROOFING

You are taking over the existing **TOPLINE FLOORING & ROOFING** repository. This is a continuation, not a rebuild.

## Mission
Continue auditing, fixing and production-hardening the existing system without breaking working features, changing the architecture unnecessarily, inventing data, or drifting from the current Supabase/PostgreSQL + Vercel + provider architecture.

Repository target:
- GitHub: `https://github.com/Themugo/TOPLINE-FLOORING`
- Local Windows path: `C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING`
- Canonical production site: `https://toplineflooringandwaterproofing.co.ke`
- Supabase project ref: `zmbsskvnzjdaxuxlauyx`
- Node: `22.x`

## Verified baseline
The supplied handoff has **89 active Supabase migrations** and the complete static verification suite currently passes **89/89**.

The latest migration is:
`20260930170000_service_catalog_and_communications_worker_hardening.sql`

It fixes the service catalogue contract by adding/reconciling:
- `services.slug`
- `services.short_description`
- `services.icon`
- `services.features`
- `project_services.service_id`

It also hardens scheduled communications by making `operations-scheduler` invoke `deliver-communications` with the server-side worker secret.

## First rule: inspect before changing
Before editing anything:
1. Read `README.md`, `DEPLOYMENT.md`, `TOPLINE-UPDATED-AUDIT-2026-09-30.md` and this prompt.
2. Inspect the current source tree and active migration chain.
3. Run the existing verification suite.
4. Identify the smallest set of changes required for the next production gate.
5. Do not create duplicate tables, RPCs, providers, services, or UI workflows when an existing implementation can be completed.

## Priority 1 — Finish service catalogue end-to-end
Audit the entire service lifecycle:
- admin create
- admin edit
- admin list/search/filter
- image upload
- slug generation/uniqueness
- description and short description
- icon
- features
- active/inactive state
- display order
- public service listing
- public service detail/slug routing
- sitemap service URLs
- project/service relationship

Verify the frontend types, hooks, forms, RPC/repository calls, SQL schema, RLS and public pages all use the same canonical service contract.

Products already work through the newer catalogue path. Do not copy product logic blindly; reuse established patterns only where they match the service domain.

## Priority 2 — Finish communications/Brevo end-to-end
Audit:
- `communication_outbox`
- enqueueing
- scheduler
- `deliver-communications`
- Brevo API request
- idempotency
- retry/backoff
- delivery-attempt audit
- provider reference
- webhook reconciliation
- failure/uncertain states
- Supabase Auth SMTP configuration documentation
- admin test email boundary

Secrets must remain server-side. Never place Brevo credentials in browser code, SQL migrations, or committed environment files.

Do not claim that email is production-ready until a real environment test proves delivery.

## Priority 3 — FIX the project-document manager
This is a known real gap.

`src/components/admin/ProjectDocumentManager.tsx` currently contains sample document records, W3C dummy PDF URLs, localStorage persistence and a fake upload result.

Replace that behavior with the existing production document architecture:
- use the existing `private-documents` Supabase Storage bucket
- use the existing permission/RLS trust boundary
- add a canonical `project_documents` metadata table only if no suitable existing table exists
- add the minimum required RPC/policies/indexes
- upload real selected files
- persist storage path, filename, MIME type, size, document type, notes, uploader and timestamps
- load real records from Supabase
- use authorized/signed access rather than public dummy URLs
- delete both metadata and storage object safely
- enforce staff permissions
- preserve auditability

Before creating anything, search all migrations for existing document/storage infrastructure.

## Priority 4 — Remove remaining fake operational behavior
Search the whole repository for:
- dummy URLs
- sample operational documents
- mock/fake operational data
- localStorage used as persistence for business records
- hard-coded fake IDs
- `TODO`, `FIXME`, `not implemented`
- public fallback data that could be mistaken for real business data

Do not remove legitimate demo/sample content from documentation or tests. Only correct production UI paths.

## Priority 5 — Production build and deployment
Confirm:
- `VITE_SITE_URL` resolves to `https://toplineflooringandwaterproofing.co.ke`
- Vercel build contract is correct
- SPA routing works
- canonical www → non-www redirect works
- robots/sitemap/security.txt are correct
- production Supabase variables are configured in Vercel
- no secret is committed

Run:
`npm run verify:all`
`npm run typecheck`
`npm run lint`
`npm run build:all`

If the local database is available, also run the database replay/validation and regenerate types:
`npm run db:types`

## Priority 6 — Real environment validation
Where credentials/infrastructure are required, do not fake success.
Report external gates separately:
- Supabase migration application
- Supabase Auth redirects
- Storage bucket/policies
- Brevo domain/sender authentication
- real email delivery
- payment provider UAT
- Vercel domain/DNS/HTTPS

## Safety constraints
- No architecture rewrite.
- No new product features unless required to complete an existing broken workflow.
- No mock data to hide empty states.
- No secret exposure.
- No destructive migration unless absolutely necessary and explicitly justified.
- Prefer additive, backward-compatible migrations.
- Preserve existing RLS and server-side permission boundaries.
- Do not change Git history.
- Do not reset or force-push.

## Definition of done
A task is complete only when:
1. source implementation is complete;
2. database contract matches the UI contract;
3. RLS/authorization is verified;
4. existing verification scripts pass;
5. typecheck passes;
6. lint passes;
7. production build passes;
8. real external dependencies are clearly marked validated or pending;
9. a concise implementation report is written;
10. no unrelated features are changed.

## Required final report
At the end, report:
- files changed
- migrations added/changed
- tests/checks run
- pass/fail result
- remaining external gates
- exact commands needed for commit/push

Do not stop at analysis. Implement the fixes that can be safely implemented locally.
