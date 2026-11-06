# TOPLINE FLOORING — Deep Admin List Workflow Audit & Repairs

**Date:** 2026-11-06  
**Authoritative foundation:** `TOPLINE-FLOORING-ADMIN-ORDERS-HOTFIX-2026-11-06.zip`  
**Scope:** Follow-up deep source audit prompted by the live mobile Orders failure. This pass expanded from Orders to all paginated admin list screens and their shared query behaviour.

## Defects confirmed and repaired

### 1. Shared pagination hook did not clamp stale pages
`src/hooks/use-pagination.ts` previously calculated offsets from the current page but did not clamp that page when a filter/search/delete/permission change reduced the result count. A stale page could request a PostgREST range beyond the filtered result set.

**Repair:** Added a shared effect that clamps the page to the last valid zero-based page whenever `totalPages` shrinks. Empty result sets clamp to page zero.

### 2. Admin Products search retained old page offset
`src/pages/admin/products.tsx` changed its search term without resetting the page.

**Repair:** Search changes now reset pagination to page zero.

### 3. Admin Customers search retained old page offset
`src/pages/admin/customers.tsx` changed its search term without resetting the page.

**Repair:** Search changes now reset pagination to page zero.

### 4. Customer and Orders search interpolated PostgREST filter metacharacters
The customer and order list search filters interpolated user-entered values into a PostgREST `.or()` expression without neutralizing reserved filter syntax. Characters such as commas, parentheses, percent signs, underscores, asterisks and backslashes could produce malformed filters or unintended matching semantics.

**Repair:** Applied the same input normalization already used by the product search: reserved filter/pattern characters are replaced with spaces and whitespace is normalized before building the `.or()` filter. This is query-syntax hardening, not a replacement for database authorization.

### 5. Overlapping search requests could return out of order
The three admin list fetchers could allow an older, slower request to resolve after a newer search and overwrite the latest results.

**Repair:** Added a per-screen request sequence guard to Orders, Products and Customers. Only the most recently issued request can update the list state.

## Files changed

- `src/hooks/use-pagination.ts`
- `src/pages/admin/orders.tsx`
- `src/pages/admin/products.tsx`
- `src/pages/admin/customers.tsx`
- `scripts/verify-admin-list-pagination-and-search.mjs`
- `docs/MASTER-WORKFLOW-REGISTER.csv`
- `docs/MASTER-WORKFLOW-REGISTER.json`
- This report

## Verification

- `node scripts/verify-admin-list-pagination-and-search.mjs` — PASS, 11/11 assertions.
- `node scripts/verify-all.mjs` — PASS, 150/150 verification scripts, 0 failures.
- ZIP integrity — PASS.

The new regression test is discovered automatically by `verify-all.mjs` and covers:
- Shared pagination clamping.
- Orders filter and search reset.
- Products and Customers search reset.
- PostgREST search term normalization.
- Stale request protection for all three paginated admin lists.

## Scope boundaries and remaining certification

This pass statically inspected every use of the shared `usePagination` hook. It found exactly three consumers: Orders, Products and Customers; all three are now hardened.

This does not establish that all business workflows in the application are complete. It also does not establish live database availability, actual record-level RLS behaviour, remote PostgREST behaviour, browser rendering or mobile-device operation.

Still pending:
- Dependency installation and typecheck/lint/build/Vitest runtime gates.
- Authenticated staging verification against Supabase.
- Browser tests with multiple result counts, empty filters, search punctuation, concurrent query responses and permission-scoped datasets.
- Full customer, payment, finance, communications, fulfilment, support and admin workflow deep audit.

No production database or deployed service was changed. No credentials were used. No Git commit/push was made.

## Disposition

The Orders pagination issue and the matching Products/Customers/shared pagination defects are repaired at source level. The next audit must continue beyond list loading into each workflow's data mutation, permissions, failure handling and customer/admin journey. Do not call the overall platform complete based on this targeted repair.
