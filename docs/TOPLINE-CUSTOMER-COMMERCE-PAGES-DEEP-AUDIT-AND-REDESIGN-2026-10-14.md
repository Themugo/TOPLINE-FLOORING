# TOPLINE Customer Commerce Pages — Deep Audit & Premium Redesign

Date: 2026-10-14
Scope: My Account (`/portal`), Shopping Cart (`/cart`), Request Quotation (`/quotation`).

## Implementation principle

This is a continuation of the existing TOPLINE React/Vite/Supabase application. The work preserves route names, service modules, RPC boundaries, cart storage key, order/payment contracts, customer authentication, portal data services and the quotation submission function. It does not introduce replacement tables, duplicate checkout paths, or direct browser writes to protected commerce tables.

## My Account (`src/pages/portal.tsx`)

### Existing workflow map retained

- Password sign-in, email magic-link sign-in, and customer registration via `src/lib/customer-portal.ts`.
- Auth session bootstrap and auth-state listener using Supabase Auth.
- Customer dashboard through `getCustomerPortal360()`.
- Customer quotations, orders, projects, installations and invoices with detail dialogs.
- Order/invoice payment options through `CustomerPaymentMethods` and `initiateCustomerPayment`.
- Activity timeline, customer documents, communication timeline, notification preferences, support/service cases and service feedback.
- Sign-out, refresh, error recovery and SEO `noIndex` metadata.

### Changes

- Premium navy/slate customer workspace treatment with more deliberate spacing and rounded, low-noise surfaces.
- Improved loading status announcement for assistive technology.
- Explicit local signed-out state after a successful sign-out action; errors remain visible if sign-out fails.
- Existing auth and data boundaries remain unchanged.

### Live acceptance still required

Test new account verification, password sign-in, magic-link expiry/reuse, expired sessions, sign-out, RLS isolation between two customers, all dashboard panels, document access, notification preference persistence, service-case submission, feedback, and invoice/order payment in authorized staging.

## Shopping Cart (`src/pages/cart.tsx`, `src/hooks/use-cart.tsx`)

### Existing workflow map retained

- Variant-aware cart state and `flooring_app_cart` local-storage persistence.
- Product detail links, quantity updates, item removal and empty-cart return to Shop.
- Delivery zone selection and delivery address capture.
- Server-backed coupon validation through `validate_coupon`.
- Order creation through `create_secure_customer_order`, preserving server-authoritative prices, stock/discount/delivery calculation and database transaction boundary.
- Payment initiation through the configured customer payment provider and `/payment-return`.
- Session-only order receipt summary and cart clearing only after payment initiation succeeds.

### Guarding changes

- Requires both a selected payment method and a selected available gateway **before** creating an order, avoiding an order being created by a checkout attempt with no usable gateway selection.
- Adds an in-flight guard against repeated submit events.
- Invalidates an applied coupon when subtotal changes and asks the customer to revalidate it.
- Improves accessible names for quantity controls, remove item, delivery zone and coupon entry.
- Refines empty-cart and checkout surfaces to match the premium navy/slate identity.

### Important remaining risks to validate

- Confirm the server RPC's idempotency behavior for retries after an order succeeds but payment initiation fails; verify whether retry returns the same order and whether payment attempts reconcile correctly.
- Confirm that a coupon is revalidated against the same authoritative subtotal and eligibility rules in the order RPC. Client coupon totals are display-only.
- Test stale product prices, deleted/inactive products, unavailable variants, stock exhaustion, delivery zone changes, payment gateway outage, payment cancellation, delayed callbacks and browser refresh after redirect.
- Test browser storage disabled/private mode and cross-tab cart updates. Current cart persistence is best-effort local storage, not a server-side cart.

## Request Quotation (`src/pages/quotation.tsx`, `src/lib/commerce.ts`)

### Existing workflow retained

- Submits through `submitQuotationRequest()` to `submit_quotation_request` RPC.
- Keeps the returned quotation reference derived from the stored quotation ID.
- Retains project system, area, site location, substrate, timeline, contact details and technical scope in the existing request contract/message payload.
- Keeps the estimate as a client-side planning guide only; it is not sent as an authoritative price.

### Guarding and copy changes

- Prevents duplicate submission while an RFQ is in flight.
- Rejects non-finite/zero/negative area and requires a project location before submitting.
- Changes area entry to a positive numeric input with decimal support.
- Caps free-text technical scope at 3,000 characters.
- Replaces unverified claims about engineering certification, guaranteed 24-hour turnaround and free site assessments with honest descriptions of review and follow-up.
- Labels the budget as indicative and does not fabricate an industrial-flooring estimate for custom categories that have no configured guide rate.
- Refines the premium navy/slate surfaces while retaining the current submission RPC and confirmation/reference behavior.

### Live acceptance still required

Submit a valid request in staging and verify both lead and quotation records appear once in their intended admin views, all fields map correctly, reference matches the saved record, notification events are created/delivered as configured, failures do not show false success, and staff can follow up from the record. Verify SQL/RPC validation and rate limiting server-side; browser validation alone is not a security boundary.

## Static checks

Run:

```cmd
node scripts/verify-customer-commerce-pages.mjs
```

The static contract checks cover routes, retained service/RPC boundaries, auth flows, cart persistence/variant identity, gateway precondition, coupon invalidation, idempotency and realistic quotation language. They do not contact Supabase and do not certify live payment, email/SMS delivery, RLS or database behavior.

## Release gate

Before production release, run `npm run typecheck`, `npm run lint`, and `npm run build:all`, then complete the staging acceptance tests above. Dependency installation timed out in the authoring environment, so this artifact must not be represented as having passed a full TypeScript/lint/production build. No migration, commit, push or deployment is included in this work.
