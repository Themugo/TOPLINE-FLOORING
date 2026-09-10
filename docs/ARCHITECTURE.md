# Topline Flooring & Waterproofing — Architecture Baseline

## Product boundary

Topline Flooring & Waterproofing is a **single-client business application**. It is not a SaaS platform and does not implement tenant isolation, tenant switching, subscription billing, or customer-specific application instances.

The application has two presentation surfaces:

- **Public website:** marketing, services, catalogue, portfolio, quotation/contact capture and customer checkout/order tracking.
- **Business portal:** authenticated staff/admin operations for the same Topline business.

Supabase is the planned persistence and authentication boundary. The Supabase project is intentionally external to this source package and will be provisioned in a later infrastructure phase.

## Canonical application root

`src/` is the only production frontend source root. The old `app/applet/` duplicate application tree has been removed.

Build/deployment inputs at the repository root (`package.json`, `vite.config.ts`, `public/`, `supabase/`, `scripts/`) remain part of the same application and are not separate products.

## Data-access direction

The codebase is converging on these boundaries:

1. **Supabase client:** `src/lib/supabase.ts` — one browser client and one configuration boundary.
2. **CMS:** `src/context/CMSContext.tsx` + `src/lib/cms-service.ts` — website-wide content/settings state.
3. **Domain hooks:** `src/hooks/` — React-facing data access and mutations used by screens.
4. **Page-specific queries:** permitted for complex screens where a dedicated domain hook would add no value, but they must use the canonical Supabase client and must not introduce a second API abstraction.
5. **Diagnostics:** `src/lib/logger.ts` — client diagnostics only. It does not assume an undocumented `/api/logs` backend or write directly to business tables.

The former generic `src/lib/api.ts` and unused `src/lib/admin-api.ts` layers have been removed. New features should not recreate them under another name.

## Authentication boundary

Admin/staff authentication uses **Supabase Auth** sessions. Browser storage flags, plaintext passwords, hard-coded admin credentials, and custom client-side authentication are not valid authentication mechanisms.

Phase 3 adds `staff_profiles`, roles, permissions, role assignments and invitations on top of the authenticated Supabase identity. Database RLS is the authoritative authorization layer.

## Configuration boundary

Required browser configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (preferred)
- `VITE_SUPABASE_ANON_KEY` (legacy compatibility)

Optional diagnostics configuration:

- `VITE_LOGGING_API_ENDPOINT`
- `VITE_SITE_URL`

When Supabase configuration is absent during UI-only development, the client transport fails locally with an explicit configuration error. The application no longer sends requests to a fake Supabase project.

## Database migrations

The historical migration directory is **historical work product, not yet the canonical production migration chain**. It contains duplicate/overlapping timestamps and generations. Do not tell operators to blindly apply the directory in filename order.

Phase 4 establishes the canonical database foundation. The active chain is:

- `20260910000000_topline_canonical_schema.sql` — normalized schema baseline,
- `20260910090000_032_commerce_contract_hardening.sql` — transaction hardening,
- `20260910100000_033_staff_rbac_audit_foundation.sql` — Auth/RBAC/RLS/audit, and
- `20260910110000_topline_rpc_contracts.sql` — RPC contracts reconciled to the canonical model.

The former prototype migrations are retained under `supabase/migrations_legacy/` and are not deployed. The dedicated Topline Supabase project must be provisioned independently of CALQULUS-PMS.

## Repository hygiene

Patch bundles and generated change artifacts are not production source. The committed `0001-warehouse-management.patch` and `all-changes.patch` artifacts have been removed.

Secrets and local environment files remain ignored by Git. Service-role credentials are developer/bootstrap-only and must never be exposed to the browser.

## Phase-1 completion criteria

Phase 1 is complete when the repository has one application root, no duplicate data/API layer that is actively required, one Supabase client boundary, Supabase Auth as the only auth model, no default credentials in documentation, no deployment-specific fake project fallback, no undocumented logging API dependency, and a buildable source tree ready for the dedicated infrastructure/RBAC work that follows.
