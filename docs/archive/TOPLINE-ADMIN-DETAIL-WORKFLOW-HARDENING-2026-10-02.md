# TOPLINE ADMIN DETAIL WORKFLOW HARDENING — 2026-10-02

## Scope

This pass moves beyond page wording and reviews the actual admin detail/action workflows for:

- Products
- Services
- Orders
- Customers
- Projects
- Quotations
- Invoices

The existing Supabase, RPC, lifecycle, RLS, storage and finance architecture is preserved. No new business feature set was introduced.

## Standard interaction contract

Every business mutation is expected to follow:

**See → Understand → Act → Validate → Save → Confirm → Refresh**

Consequential/destructive actions additionally follow:

**Review → Confirm → Execute → Report result**

The UI must distinguish successful persistence from failed or uncertain operations and should not present a success state before the underlying operation completes.

## Changes implemented

### Products

- Product creation now requires a product name.
- Duplicate submit protection remains enforced through the existing saving state.
- Product save success is followed by an authoritative product-list refresh before the form closes.
- Save failures use customer-facing language while retaining the useful uniqueness guidance.
- Gallery primary-photo updates now handle failures explicitly.
- Gallery photo removal now requires confirmation.
- Existing product admin operations and canonical persistence are preserved.

### Services

- Admin service loading now uses `activeOnly: false`.
- Hidden services therefore remain visible to administrators and can be edited or republished.
- Publish/hide now reports the actual customer-facing result.
- Existing create/update/delete persistence and hook refresh behavior are preserved.

### Orders

- Order detail already loads through the existing Order Operations 360 boundary.
- Payment reconciliation now refreshes both the detail view and order list.
- Status changes now refresh the order list and, when the changed order is open, refresh its detail data too.
- Main order loading now exposes a retryable error state instead of silently showing an empty result.
- A manual order-list refresh control was added.
- Existing transactional status RPC and finance reconciliation architecture are preserved.

### Customers

- Main customer-list loading now exposes errors with a retry path.
- Customer detail now distinguishes loading, successful data, and failed activity loading.
- Customer detail has an explicit refresh action.
- Existing order and quotation relationship queries are preserved.

### Projects

- Duplicate project-save submission is guarded.
- Project name is required before persistence.
- Successful create/update waits for the project list refresh before reporting success.
- Delete now has a more explicit confirmation message and reports successful deletion after refresh.
- Existing project budget, gallery, documents, delivery and template workflows are preserved.

### Quotations

- Conversion now waits for quotation refetch before closing the detail screen.
- Follow-up creation now waits for refetch and uses business-facing confirmation wording.
- Quotation item creation validates description, quantity and price before calling the existing transaction RPC.
- Item removal requires confirmation.
- Existing quotation item transaction RPCs continue to calculate and persist quotation totals server-side.

### Invoices

- Payment recording rejects non-positive/non-finite amounts.
- Payments cannot be recorded against an already-paid invoice.
- Overpayments are blocked at the UI boundary with the current maximum payable balance shown.
- Payment success explicitly states that balance/status were refreshed.
- Removing invoice charges requires confirmation.
- Existing invoice transaction functions remain the source of truth and already refetch invoice data after mutations.

## Important existing architecture verified

Quotation item persistence is not being faked in the browser. The existing `upsert_quotation_item_transaction` and `remove_quotation_item_transaction` RPCs recalculate and persist quotation subtotal, tax and total in PostgreSQL.

Invoice item and payment mutations continue through the existing finance transaction functions and the `useInvoices` hook refreshes authoritative invoice data after successful mutations.

## Verification performed locally

- All seven target admin page source files were inspected and modified in the extracted source package.
- Structural checks confirm the expected workflow guards and refresh/error paths are present.
- The uploaded package itself is the source baseline used for this pass.
- No Git history was reset and no push was performed.
- No database migration was added for this UI interaction pass.

## Dependency-backed verification status

The uploaded package does not contain `node_modules`, so a full dependency-backed TypeScript compile cannot honestly be claimed from this isolated package.

The following therefore remain **REQUIRES LOCAL PROJECT TOOLCHAIN**:

- `npm ci`
- `npm run db:types`
- `npm run typecheck`
- `npm run lint`
- `npm run build:all`
- Browser/E2E interaction testing against a real Supabase environment

## External gates

The previously known live Supabase connection problem remains separate from this UI pass. No claim is made here that live schema deployment, generated DB types, provider UAT, or production deployment has been completed.
