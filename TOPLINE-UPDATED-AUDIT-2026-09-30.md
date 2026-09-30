# TOPLINE FLOORING & ROOFING — Updated End-to-End Audit
## 30 September 2026

### Current verified state
- Active Supabase migrations: **89** with unique timestamps.
- Full static verification suite after this handoff repair: **89/89 passed, 0 failed**.
- Service catalogue schema/application contract has been reconciled.
- `project_services.service_id` now exists as an additive direct relation to `services`.
- Operations scheduler now invokes `deliver-communications` using the worker secret.
- Brevo transactional worker remains server-side and idempotent.
- Typecheck/lint/targeted launch-repair checks previously passed.
- Local full build still requires the production site URL environment contract; the build script now safely falls back to the documented canonical URL in `.env.example` for local sitemap generation.

### Important distinction
Static verification proves source/configuration contracts. It does **not** prove live Supabase migration application, live Brevo credentials/domain authentication, live Vercel domain/DNS, live Auth redirect configuration, or successful real recipient delivery. Those remain external launch gates.

## Findings requiring Claude Code attention

### P0 — Production database/application activation
1. Apply/replay the new service catalogue + communications migration against the intended Supabase project.
2. Verify the live `services` table contains `slug`, `short_description`, `icon`, and `features` and that existing rows were safely backfilled.
3. Verify service creation/edit/delete/list workflows against the real database, including RLS and staff permissions.
4. Verify scheduler → `deliver-communications` → provider flow in the deployed environment.

### P0 — Brevo live delivery
1. Confirm the Brevo sender domain is authenticated with the required DNS records.
2. Confirm sender and reply-to addresses are verified.
3. Confirm `BREVO_API_KEY`, sender, reply-to, webhook secret and worker secret exist only in the server/Edge Function secret store.
4. Run one real transactional email test to an approved test recipient.
5. Verify outbox state transitions, delivery-attempt audit, provider reference, retry behavior and webhook reconciliation.
6. Verify Supabase Auth email configuration separately from application transactional mail.

### P1 — Project document management is not production-backed
`src/components/admin/ProjectDocumentManager.tsx` currently contains sample documents using the W3C dummy PDF URL, localStorage persistence, and a fake upload result. This must not be presented as real document storage.

Required implementation direction:
- Use the existing `private-documents` Supabase Storage bucket and its existing trust boundary.
- Store project-document metadata in a proper database table/RPC boundary rather than localStorage.
- Upload the selected file to a project-scoped path.
- Persist metadata, uploader, document type, size, MIME type and storage path.
- Read documents from the database on load.
- Generate authorized access/download URLs rather than public dummy URLs.
- Delete metadata and storage objects safely.
- Preserve staff permission/RLS controls.
- Do not introduce a second storage architecture.

### P1 — Portfolio is database-backed but must remain honest
The portfolio page correctly falls back to an empty state when the project query fails. Do not add fabricated project records. Review the hard-coded headline metrics such as installed square metres and warranty claims and ensure they are either approved company facts or moved into governed CMS content.

### P1 — Build/deployment contract
The canonical site is:
`https://toplineflooringandwaterproofing.co.ke`

The repository now declares this in `.env.example` and Vercel configuration. Before production release, confirm the Vercel project has the required public Supabase variables and that the domain/DNS/HTTPS/canonical redirect are live.

### P1 — Generated database types
The repository's generated database types are not currently present. After a successful local/linked database replay, run:
`npm run db:types`
Then run typecheck and the complete verification suite again. Do not commit generated types containing secrets.

### P1 — Payment/provider boundary
The release candidate gate intentionally keeps payment provider activation fail-closed until a real provider adapter/UAT is configured. Do not weaken this control merely to make tests green.

### P2 — Operational verification
Before launch, perform real-world checks for:
- admin login/logout/session expiry
- staff permissions and RLS isolation
- product create/edit/image upload
- service create/edit/image/content fields
- quotation → order → payment/invoice lifecycle
- project creation → field operations → completion
- customer portal access
- order tracking privacy
- email/SMS/WhatsApp provider behavior where enabled
- backups/restore and incident procedures

## What must NOT be changed casually
- Do not replace Supabase/PostgreSQL with another database.
- Do not remove the service-role/server-side trust boundaries.
- Do not expose Brevo, payment, SMS or WhatsApp secrets in the browser.
- Do not add mock/demo operational data to make screens look populated.
- Do not duplicate existing business workflows.
- Do not rewrite the application architecture merely for visual changes.
- Do not reset or rewrite the existing Git history.

## Launch sequence
1. Commit the current handoff changes.
2. Push when GitHub authentication is available.
3. Link/replay the intended Supabase environment and apply migrations.
4. Generate DB types.
5. Run full local verification, typecheck, lint and build.
6. Deploy to Vercel with the documented environment variables.
7. Validate domain/DNS/HTTPS and canonical redirect.
8. Validate Brevo live delivery and webhook reconciliation.
9. Validate customer/admin critical journeys.
10. Only then declare launch readiness.
