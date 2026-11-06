# Phase 3 — Cart, Quotations & Checkout Audit Report

**Date:** 2026-11-06  
**Foundation:** `TOPLINE-FLOORING-PHASE-2-PRODUCT-INVENTORY-2026-11-06.zip`  
**Foundation SHA-256:** `8f879418a85dfd48ed796cf2a3a5bfce9cbcfe522694664c2937c44f8344a05b`  
**Status:** Source repairs complete; not production-certified.

## 1. Scope

Audited the existing customer cart state and page, live catalogue reconciliation, quotation request form and RPC wrapper, customer quotation acceptance/conversion functions, checkout order RPC contract, coupon validation, inventory reservations, payment initiation/recovery contracts, and related static regression gates.

The existing architecture and information architecture were preserved. No new marketplace, mock catalogue, pricing source, or replacement quotation workflow was introduced.

## 2. Findings and repairs

### P3-01 — Cart stock cap treated zero/unknown stock as unlimited
**Severity: High — cart correctness.**

`maxQuantityFor()` returned positive infinity whenever reported stock was zero or non-positive. This allowed shared cart actions to add an unavailable item or accept a quantity before the server rejected it.

**Repair:** Zero, non-finite or unknown stock now produces a zero allowance. Add actions reject invalid/non-positive quantities and unavailable stock; update actions normalize quantities to whole units. Server-side stock checks remain authoritative.

### P3-02 — Checkout retry fingerprint omitted material order inputs
**Severity: High — idempotency/retry correctness.**

The browser fingerprint covered cart lines, delivery zone, coupon, email, phone and address, but omitted customer name, order notes and selected payment method. A retry after changing one of those fields could reuse the previous order's idempotency key and receive the old order rather than create the intended checkout.

**Repair:** Added customer name, notes and payment method to the fingerprint and passed them from the checkout page. Gateway selection remains scoped to payment-attempt idempotency, allowing a customer to retry payment through a different gateway for the same already-created order.

### P3-03 — Database order-line boundary did not enforce variant-managed product selection
**Severity: Critical — inventory bypass.**

Phase 2 established that active variants own the sellable stock for variant-managed products. The order-line schema still allowed an order line to reference the parent product with a null `variant_id`, which could bypass the option-level stock model if a caller omitted the variant.

**Repair:** Added `20261106140000_cart_checkout_variant_integrity.sql`. A `BEFORE INSERT OR UPDATE` trigger on `order_items` rejects a parent-only order line when the product has active variants, and rejects variants that are inactive or belong to another product. The trigger function is not executable by browser roles. Existing order creation and quotation conversion functions remain in place and are subject to this shared order-line invariant when they insert product-linked lines.

## 3. Quotation workflow review

- Public quotation requests continue to use `submit_quotation_request()`; the client does not invent a formal quotation number or pricing.
- Customer acceptance remains ownership-gated through `respond_to_customer_quotation()` and is serialized with a quotation row lock.
- Accepted quotations continue through the existing private conversion core, which creates the order/project and records lifecycle events.
- Expired quotations are rejected for acceptance.
- Decline and change requests require a customer note.

**Operational caveat retained:** the acceptance function deliberately catches conversion exceptions so a conversion failure does not undo the customer's acceptance. It returns a `conversion_note` for the caller, and staff can convert manually. This means acceptance and successful order/project conversion are distinct outcomes; verify the admin queue and operational alerting in staging before production use. This phase did not change that established business rule.

**Commercial caveat retained:** the quotation conversion is a project quotation workflow, not a stock reservation checkout. The conversion core creates order items from quotation lines but does not create `inventory_reservations`. Do not treat an accepted project quotation as a reserved stock order without an explicit commercial policy and schema design decision. Product-linked quotation lines are now subject to the Phase 3 variant integrity trigger.

## 4. Checkout and payment contract review

- Cart catalogue reconciliation refreshes product/variant price and stock before checkout when the catalogue read succeeds.
- Client totals remain display-only; `create_secure_customer_order()` recalculates prices, delivery and coupon discount on the server.
- Checkout sends product/variant identities and quantities, not trusted client prices.
- Server order creation aggregates duplicate product/variant lines before checking stock and creates inventory reservations.
- Coupon validity and usage limits are rechecked during order creation; coupon use is released by the existing cancellation/expiry lifecycle.
- Payment initiation remains a separate step after order creation. Existing payment recovery uses stable order/gateway idempotency and token-protected access.

## 5. Verification

### Phase 3 targeted checks

- `verify-audit-3-cart-quotations-checkout.mjs` — **16/16 passed**
- `verify-shop-cart-end-to-end.mjs` — **21 assertions passed**
- `verify-cart-stock-eligibility.mjs` — **6 assertions passed**
- `verify-guest-payment-resume.mjs` — **19/19 passed**
- `verify-order-payment-recovery.mjs` — **17/17 passed**
- `verify-customer-commerce-pages.mjs` — **16/16 passed**
- `verify-commerce-fulfillment-360.mjs` — passed
- `verify-payment-inventory-lifecycle.mjs` — passed
- `verify-payment-webhook-reconciliation-360.mjs` — passed
- `verify-order-operations-360.mjs` — passed
- `verify-audit-2-product-inventory-hardening.mjs` — **51/51 passed**
- `verify-migration-integrity.mjs` — passed
- `verify-sql-runtime-safety.mjs` — passed
- `verify-project-documents.mjs` — passed
- `verify-vercel-production-contract.mjs` — passed
- `verify-all.mjs` — **153/153 passed, 0 failed**

### Not run / not certified

- `node_modules` is not present in this package; no dependency installation was completed in this phase.
- Project TypeScript typecheck, Vite production build and Vitest browser/component suite were not run.
- No local or staging PostgreSQL migration replay was performed. The new trigger has static checks only; confirm its behavior against the full migration chain before deployment.
- No Playwright/browser journey, mobile checkout, coupon race, simultaneous stock contention, quotation acceptance/conversion UAT, or real payment-provider transaction was performed.
- No linked Supabase migration push, production data change, deployment, Git commit or push was performed.

## 6. Phase 2 constraints carried forward

1. Stock quantities are integer-only; fractional sqm is not represented safely by the current stock schema.
2. Warehouse stock is product-level and is not variant/location-aware.
3. Purchase-order lines do not have `variant_id`; procurement for variant-managed products remains deliberately blocked rather than credited to the wrong stock counter.
4. Legacy unlinked/fractional purchase-order lines require authorized correction or cancellation/recreation.

## 7. Acceptance decision

**Phase 3 source repairs are complete. Phase 3 is not production-certified.** Before moving the package into production, apply all migrations to a disposable/staging database, run the checkout and quotation browser journeys, verify reservation expiry and coupon accounting under retries/concurrency, and complete M-Pesa/manual-payment UAT. The Phase 3 ZIP is the authoritative source foundation for Phase 4 once those staging gates are accepted.
