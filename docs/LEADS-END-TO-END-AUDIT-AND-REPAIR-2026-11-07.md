# TOPLINE Leads — End-to-End Audit & Repair

**Foundation:** `TOPLINE-FLOORING-PHASE-19-COMPLETE-2026-11-07.zip`  
**Audit date:** 2026-11-07  
**Scope:** Public enquiry intake, lead persistence, staff read/list, search/filter, create/edit/delete, CRM pipeline, conversion handoff, authorization and error handling.

## Executive finding

The Leads page had a confirmed frontend/database contract mismatch that can explain the generic application error shown by the user.

The canonical database table `public.leads` stores:
- `name`
- `company`
- `status`

The legacy Leads list and form were written against:
- `customer_name`
- `company_name`
- `lead_stage`

The list's initial `filteredLeads` calculation called `lead.customer_name.toLowerCase()` without a null guard. The database row does not contain `customer_name`, so the initial render can throw a `TypeError` before the user even types in the search box. This is a direct, code-supported root cause for a React error boundary screen when opening `/admin/leads`.

The same mismatch affected writes: the form submitted `customer_name`, `company_name`, and `lead_stage`, while the existing lifecycle RPC accepts `p_name`, `p_company`, and `p_status`. The hook previously passed only `lead.name`, `lead.company`, and `lead.status`, so create/edit through this legacy form could send an empty name or omit the intended fields.

## End-to-end trace

1. **Public contact / quotation enquiry:** `src/pages/contact.tsx` calls `submitQuotationRequest`.
2. **Public RPC boundary:** `src/lib/commerce.ts` calls `submit_quotation_request`.
3. **Database intake:** The latest function definition in `20261020110000_guest_to_registered_continuity_360.sql` validates input, applies duplicate/rate limits, inserts a canonical lead and linked quotation, then links the quotation back to the lead in the same transaction.
4. **Public write security:** `20261016090000_public_write_surface_and_email_abuse_controls_360.sql` revokes anonymous direct table inserts. The public site uses the RPC boundary; no RLS weakening was needed.
5. **Staff reads:** `useLeads` queries `public.leads` ordered by `updated_at`.
6. **Staff mutations:** create/update/delete use lifecycle RPCs that enforce `leads.insert`, `leads.update`, and `leads.delete` permissions.
7. **Conversion:** lead-to-customer conversion remains an existing RPC path and is preserved.
8. **Route access:** `/admin/leads` remains mapped to `leads.select` in the admin route permission catalogue.

## Repairs applied

- Added a single normalization boundary in `useLeads` that preserves canonical fields and provides compatibility aliases for existing UI consumers.
- Mapped create form aliases to canonical RPC inputs (`name`, `company`, `status`).
- Mapped edit aliases to canonical update RPC inputs, including `negotiation` → `negotiating` status normalization.
- Made the Leads list search null-safe and compatible with either canonical or legacy field names.
- Aligned the stage filter and display with the database's canonical `negotiating` value.
- Added visible read-error state and a retry action to `/admin/leads` instead of allowing a failed read to look like an empty pipeline.
- Added the same load-error visibility to the separate CRM pipeline page, which shares `useLeads`.
- Added `verify:leads-end-to-end-360` with 13 targeted static contract assertions and registered it in GitHub Actions CI.

## Validation

- Leads end-to-end focused verifier: **13/13 passed**.
- Repository-wide `scripts/verify-all.mjs`: **167/167 passed** before the CI workflow step was added.
- Migration integrity verifier: passed.
- Existing public contact / quotation workflow contracts were included in the full repository suite and passed.
- Existing lifecycle RPC permission checks and public direct-insert revocation were confirmed by source-level assertions.

## Important limitations

- This is a source-level diagnosis. The user's live browser diagnostic payload and production database/provider logs were not available, so the screenshot cannot be proven to have originated from this exact TypeError. However, the mismatch and unguarded call are confirmed defects in the supplied Phase 19 codebase and are sufficient to crash the Leads page on initial render when normal database rows are returned.
- `node_modules` is absent in this environment. TypeScript, ESLint, Vite production build and browser/device E2E tests were not run.
- Staging verification is still required for staff role/RLS behavior, real website enquiry submission, lead create/edit/delete, lead conversion and concurrent/duplicate public enquiry submission.
- No database migration was required; the authoritative database schema and RPC contracts were already consistent. The repair aligns the frontend to those existing contracts.
- No production database changes, deployment, Git commit or push were made.

## Changed files

- `src/hooks/use-data.ts`
- `src/components/leads/LeadList.tsx`
- `src/components/leads/LeadForm.tsx`
- `src/pages/admin/leads.tsx`
- `src/pages/admin/crm.tsx`
- `scripts/verify-leads-end-to-end-360.mjs`
- `package.json`
- `.github/workflows/ci.yml`
