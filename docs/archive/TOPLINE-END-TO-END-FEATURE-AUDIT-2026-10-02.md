# TOPLINE FLOORING & WATERPROOFING — END-TO-END FEATURE / WORKFLOW / DATABASE AUDIT
## 2026-10-02 hardening continuation

## Scope
This audit uses the supplied `TOPLINE-FLOORING-main (12).zip` as the source baseline. The objective was to audit existing functionality feature-by-feature and workflow-by-workflow, trace UI -> Supabase -> database/RLS -> workers/providers -> user-visible state, and harden defects without introducing new product features.

## Baseline inventory
- React/Vite application with public site, customer self-service and protected admin control plane.
- 68 admin page modules are routed from the application router; public page modules cover shop, services, portfolio, quotation, contact, portal, tracking, order confirmation and supporting pages.
- 11 Supabase Edge Functions are present for communications, provider webhooks, scheduling, reservation expiry and customer data export.
- 101 active Supabase migrations remain after removing one redundant duplicate migration.
- 101 migration timestamps are unique and strictly ordered.
- Static verification suite: **98/98 passed, 0 failed**.
- Database dependency scan: 101 migrations, 153 tables, 219 functions, 277 foreign-key references.

## Workflow audit matrix

| Area | UI / entry points | Persistence / authority | Security / communication boundary | Result |
|---|---|---|---|---|
| Identity & admin access | Admin login, guard, staff profile | Supabase Auth + staff/RBAC tables | Auth identity + permission RPCs + RLS | Hardened / statically verified |
| Public CMS | Public pages + CMS context | `site_settings` / canonical content tables | Public read client; admin mutation boundary | Hardened to fail closed |
| Services | Public services/detail + Admin Services | `services` | Staff RBAC/RLS; Storage image boundary | Hardened; live schema still needs deployment |
| Products & variants | Shop/detail/cart/compare + admin catalogue | Products, variants, images, specs, docs | RLS + authoritative pricing/variant checks | Statically verified |
| Cart & checkout | Cart, checkout flow, success/confirmation | Orders, order items, reservations, coupons | Customer identity/idempotency/RPC boundary | Statically verified |
| Order tracking | Track Order + confirmation | Public tracking RPC | Order number + checkout phone | Hardened/privacy verified |
| Quotations | Public quotation + Admin Quotations | Quotations/items + conversion RPC | Customer binding + collision controls | Statically verified |
| CRM / leads | Admin CRM/Leads | Leads, notes, reminders | Staff permission boundary | Statically verified |
| Projects | Admin Projects / portfolio | Projects + public_projects view | Public/private column boundary + staff RLS | Hardened |
| Project costs | Budget tracker + profitability | `project_cost_entries` | Staff project permission + RPCs | **Ledger made authoritative** |
| Project documents | Document Vault | `project_documents` + private Storage | Metadata-scoped Storage policies | Hardened |
| Field operations | Site visits, delivery, installation, field ops | Operational tables + RPC snapshots | Staff permissions + audit controls | Statically verified |
| Inventory/procurement | Inventory, warehouses, suppliers, POs | Inventory/reservation/procurement tables | RLS/RPC lifecycle controls | Statically verified |
| Finance | Invoices, finance command center, profitability | Invoices/payments/refunds/reconciliation | Provider boundary + finance permissions | Statically verified; provider UAT pending |
| Customer portal | Portal / service cases / feedback | Customer portal/service-case tables | Customer ownership + verified-email controls | Statically verified |
| Communications | Communications, journey, customer lifecycle | Outbox + delivery attempts + inbound events | Worker secret + provider secrets server-side | Hardened; provider UAT pending |
| Email | Brevo worker/test | Communication outbox + delivery attempts | Brevo API key server-side + idempotency | Static contract verified |
| SMS | Africa's Talking worker/report/inbound | Outbox + delivery report | Provider secrets server-side | Static contract verified |
| WhatsApp | Meta worker/webhook | Outbox + provider events | Provider token/signature boundary | Static contract verified |
| Admin notifications | Notification center | `admin_notification_states` + operational data | Per-user RLS | **Removed fake CRM alert/localStorage** |
| Site control | Theme/content/site controls | Site settings/design/integration/flags | Admin control-plane permissions | Statically verified |
| Audit/governance | Audit logs, governance, access, QA, HSE | Audit/control tables + RPCs | Privileged permission boundaries | Statically verified |
| Backups/continuity | Admin backup/BC screens | Recovery/export/control RPCs | Privileged access controls | Static structure verified; real drill pending |
| Deployment | Vercel config, release gates | Supabase/Vercel external services | CSP/security headers/env boundary | Static verified; live UAT pending |

## Fixes applied in this continuation

### 1. Migration tree repaired
Removed the redundant:
`20260930190000_project_document_vault_360.sql`

The canonical project-document implementation remains:
`20260930180000_project_documents_private_storage.sql`

The legitimate `20260930190000_staff_read_inactive_cms_catalog_rows.sql` remains the sole migration using that timestamp.

The later project-template persistence migration was converted from a duplicate `CREATE TABLE IF NOT EXISTS` definition into an additive hardening migration over the canonical `project_templates` table.

### 2. Project budget / cost ledger authority repaired
The previous Budget Tracker could generate fabricated expenditure rows and could write actual expenditure totals into `projects.actual_expenses` alongside the real `project_cost_entries` ledger.

The tracker now:
- loads actual cost rows from `project_cost_entries`;
- calculates actual expenditure from ledger rows;
- adds costs through `add_project_cost_entry`;
- deletes costs through `delete_project_cost_entry`;
- no longer fabricates default expense rows;
- no longer requires browser persistence for cost data;
- continues to edit the project budget itself as the existing business function.

The project edit form no longer accepts a second manual `Actual Expenses` value. This prevents two competing financial authorities.

### 3. Admin notification integrity repaired
The notification center now derives budget alerts from `project_cost_entries` rather than `projects.actual_expenses`.

It also:
- removed the fabricated CRM lead alert;
- removed `localStorage` business persistence;
- uses `admin_notification_states` for per-user read/dismiss state;
- keeps alert generation tied to actual project/deadline data;
- reports notification-state persistence errors instead of silently swallowing them.

### 4. CMS fail-closed behavior repaired
CMS loading no longer falls back to fabricated demo content when Supabase is unavailable or returns an error.

CMS mutation flow now:
1. writes to Supabase;
2. verifies persistence succeeded;
3. only then updates the in-memory cache.

A structurally compatible empty CMS state is used for failure/loading safety rather than business/demo content.

Unsupported/fabricated public statistics and fictional map/contact records were removed from the runtime-safe CMS defaults.

### 5. Project document deletion hardened
Deletion now:
1. removes the metadata row first;
2. retries Storage cleanup twice;
3. refreshes the metadata list;
4. explicitly reports when metadata was removed but Storage cleanup failed.

This prevents the UI from claiming successful complete cleanup when Storage deletion did not succeed.

### 6. Customer export CORS hardened
The customer data export Edge Function no longer uses wildcard CORS.

It now uses:
`TOPLINE_WEB_ORIGIN`
with the canonical Topline production origin as the default, plus explicit allowed methods and `Vary: Origin`.

### 7. DB type generation made more robust on Windows
`generate-db-types.mjs` now prefers a Supabase CLI executable available on PATH before falling back to `npx`.

This reduces child-process failures when the Windows project path contains shell metacharacters such as `&`.

## Communication / database flow status
The existing communications architecture remains:

`business event -> communication_outbox -> claim worker -> provider -> delivery attempt audit -> completion/failure -> inbound/delivery report reconciliation`

Provider secrets remain Edge/server-side. The worker includes provider timeouts, idempotency, retry classification, uncertain-delivery handling and prior-accepted-attempt recovery.

The operations scheduler uses an automation lock before invoking delivery/reconciliation/expiry jobs.

No new communication channel or business workflow was introduced.

## External gates that cannot be certified from this ZIP alone

These require the actual user's environment or external provider access:

1. Linked Supabase migration replay / `supabase db push`.
2. Live `services` schema certification.
3. Generated database types after successful local DB replay.
4. Deno execution of all 11 Edge Functions.
5. Real Brevo delivery/test.
6. Real Africa's Talking SMS delivery/reporting.
7. Real WhatsApp provider UAT/webhook verification.
8. Payment provider UAT and reconciliation evidence.
9. Vercel deployment, DNS, HTTPS and production browser checks.
10. Backup/restore drill.
11. Full authenticated browser UAT across admin/customer workflows.

## Current migration connection blocker
The previously reported:
`tls error ... aws-0-eu-central-1.pooler.supabase.com:5432 ... i/o timeout`
remains an external connectivity issue. Nothing in this source audit indicates that the application migration SQL itself is responsible for that timeout.

The safe deployment sequence remains:
1. Validate the migration tree locally.
2. Use a Supabase direct/non-pooler connection where supported by the local network/CLI.
3. Run a linked dry-run/review.
4. Run the authorized `supabase db push`.
5. Verify the live catalogue schema.
6. Run the services installation E2E check.
7. Generate database types.
8. Run typecheck/lint/build on the actual Windows checkout.

Never use `supabase db reset --linked` against production.

## Verification evidence

### Static source/database verification
**98/98 passed — 0 failed.**

### Migration integrity
**101 active migrations / 101 unique timestamps / strict ordering.**

### Changed-file syntax/transpile sweep
Passed for the modified TS/TSX files in this audit.

### Dependency-backed build gate
Not certified in this isolated workspace because `npm ci` could not obtain uncached registry packages. The host's existing Windows checkout must run:

```cmd
npm ci
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
```

## No feature expansion
This continuation intentionally did not add a new product capability. Changes are limited to:
- correcting authority boundaries;
- removing fabricated/demo runtime behavior;
- repairing persistence order;
- tightening security/communication boundaries;
- reconciling migrations;
- improving deployment/type-generation reliability;
- making existing workflows truthful when external services fail.
