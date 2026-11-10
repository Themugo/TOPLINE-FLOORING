# Leads / CRM — Live Enquiry, Lead, Quotation and Conversion Test Report

**Foundation:** `TOPLINE-FLOORING-COMMERCE-CONCURRENCY-TESTING-G13-2026-11-07.zip`  
**Audit date:** 2026-11-07  
**Scope:** Public enquiry intake, lead persistence and management, quotation lifecycle, customer response, lead conversion, quotation-to-order/project conversion, authorization, duplicate handling and concurrent submissions.

## Executive result

The supplied G-13-based source passes its existing CRM and sales lifecycle regression suite. This is a **source-level result**, not a live/staging certification. No staging credentials, authenticated browser session, disposable Supabase/PostgreSQL database or provider sandbox was available in this execution environment; consequently no live enquiry, staff workflow, customer response, or concurrent database transaction was executed.

A material race-condition risk was identified in the public enquiry RPC and is a **live-UAT blocker** until reproduced or disproved against a disposable/staging database.

## Existing flow traced

1. Public contact and quotation pages call `submitQuotationRequest` in `src/lib/commerce.ts`.
2. The client invokes `public.submit_quotation_request`.
3. The database function validates name, email, phone and bounded free-text fields; normalizes email; checks recent duplicates and rate limits; inserts a `public.leads` row and a linked `public.quotations` row; then stores the quotation link on the lead.
4. Admin Leads and CRM views read canonical lead fields through the shared hook and enforce server-side lifecycle permissions for create/update/delete.
5. Lead-to-customer conversion uses `public.convert_lead_to_customer`, locks the lead row, serializes conversion by normalized email, reuses an existing customer, and returns the existing relationship on repeat conversion.
6. Customer quotation responses are restricted to the owning customer and open quotation states. Accept, decline and request-changes map to accepted, rejected and negotiating; decline/change requests require a note.
7. Customer acceptance attempts quotation-to-order/project conversion. The conversion path locks the quotation, checks acceptance and line items, resolves a canonical customer, creates order/order lines/project, updates quotation and linked lead, and records a lifecycle event. The staff conversion RPC validates permissions and existing downstream links before returning an idempotent result.

## Findings

### CRM frontend/database contract

The G-13-based source contains the prior repair for the canonical `leads` schema (`name`, `company`, `status`) versus legacy UI aliases. The hook normalizes fields; list search is null-safe; lead create/update maps to canonical RPC inputs; Leads and CRM views surface load errors and retry actions. No new mismatch was found by the existing source verifiers.

### Lead conversion

The conversion migration contains a transaction, `FOR UPDATE` on the lead, normalized-email customer matching, an advisory transaction lock keyed by normalized email, missing-email rejection, idempotent already-converted handling and a `lead_converted` audit event. Static contract checks pass. Simultaneous calls still require staging execution to verify actual PostgreSQL behavior and permissions.

### Quotation response and conversion

Customer response checks portal identity/ownership, quotation status and expiry, and requires notes for decline/change requests. The conversion core locks the quotation and returns existing linked order/project records on repeat conversion. The later integrity migration additionally validates that linked order and project records exist and point to the same customer. Static checks pass; concurrent customer acceptance and staff conversion have not been exercised against a live database.

### OPEN — public enquiry duplicate race

`public.submit_quotation_request` performs a recent-duplicate lookup and rate-limit counts before inserting the lead and quotation. In the inspected function body, there is no transaction-scoped advisory lock or equivalent serialization around the duplicate lookup plus insert. Two concurrent transactions using the same normalized email and same message can both observe no prior row and both insert. The function's comment describing double-click/retry deduplication is therefore not, by itself, proof of concurrency safety.

**Required disposition:** execute the two-session race test in the runbook on disposable/staging data. If duplicate records are observed, implement a follow-up migration that serializes the normalized contact key before duplicate/rate-limit checks and inserts, then replay the full migration chain and rerun the race test. Do not hot-edit production or manually delete resulting customer records.

## Verification executed in this workspace

| Check | Result |
|---|---:|
| `npm run test:g15-leads-crm` | PASS — 13 + 13 + combined Phase 15–17 verifier |
| `npm run verify:g15-leads-crm` | PASS — 18/18 |
| `node scripts/verify-phase-16-quotation-order-project.mjs` | PASS — 16/16 |
| `node scripts/verify-all.mjs` | PASS — 189/189, 0 failed |
| Input archive ZIP integrity | PASS |

These checks inspect source contracts. They do not execute database transactions, browser interactions or external integrations.

## Not executed

- Public website enquiry submitted against staging.
- Simultaneous public enquiry requests / duplicate race.
- Live admin role and RLS authorization matrix.
- Staff assignment, notes, reminders and audit-history persistence in the browser.
- Customer portal quotation acceptance, decline and request-changes.
- Concurrent lead conversion or concurrent quotation conversion.
- Email delivery, CRM notification delivery or provider callbacks.
- Browser/mobile E2E, TypeScript, lint, or production build (dependencies/runtime not provisioned).
- Full migration replay against PostgreSQL/Supabase.

## Safety boundary

No production database, Supabase project, customer data, email provider, DNS, hosting, Git remote, commit, push or deployment was changed. No live test data was created. Production certification remains **OPEN / NO-GO** until the staging UAT matrix passes and the enquiry duplicate race is resolved or conclusively disproved.
