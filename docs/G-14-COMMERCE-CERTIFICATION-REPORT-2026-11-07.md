# G-14 — Commerce certification report

**Foundation:** `TOPLINE-FLOORING-G-13-EMAIL-DELIVERABILITY-2026-11-07.zip`  
**Scope:** Product catalogue and variants, cart eligibility, checkout/idempotency, quotations, coupon and delivery calculations, payment initiation/recovery, order lifecycle, fulfilment, inventory reservation, customer order tracking and privacy.

## Work performed
- Preserved the existing `TOPLINE-FLOORING-main/` project root and existing application structure.
- Audited existing commerce modules, customer routes, migration set and regression scripts.
- Added `scripts/verify-g14-commerce-certification.mjs`, which checks that the core commerce source files and 15 established regression verifiers remain present and wired in package scripts.
- Added `verify:g14-commerce` and `test:g14-commerce` package commands.
- Added the G-14 source gate to CI when the existing workflow supports the insertion point.
- No schema/migration was added and no product/order/payment data was changed.

## Regression execution
All 15 existing targeted regression scripts completed successfully in this workspace:
1. shop/cart end-to-end
2. cart stock eligibility
3. commerce entrypoints
4. commerce fulfilment
5. customer commerce pages
6. ecommerce stability
7. order payment recovery
8. payment inventory lifecycle
9. public order tracking privacy
10. Phase 2 product/inventory hardening
11. Phase 3 cart/quotation/checkout
12. Phase 4 order/fulfilment/finance
13. Phase 11 inventory/procurement
14. Phase 16 quotation/order/project
15. Phase 19 order confirmation/delivery reliability

The new G-14 source verifier also checks the required source and test wiring. These are repository-level regression checks, not a real customer checkout or provider transaction.

## Not certified / remaining live evidence
G-14 is **OPEN for production certification** until an isolated staging run records:
- published catalogue and variant pricing/stock against the staging database;
- cart/checkout with stock reservation and idempotent retry;
- coupon, tax, delivery-zone and total calculation against configured staging values;
- successful and declined payment-provider paths, webhook reconciliation and payment recovery;
- cancellation/refund and fulfilment lifecycle, including inventory restoration;
- customer order confirmation/tracking access-control checks;
- browser evidence across desktop and mobile, with sanitized order IDs and provider references.

No production database, live payment account, DNS, customer data, deployment, Git commit or push was touched. The assistant workspace does not contain the staging credentials, real payment sandbox account or customer fixtures needed to claim those live checks passed.

## Windows CMD
Run from the extracted project root:
```cmd
npm ci
npm run verify:g14-commerce
npm run test:g14-commerce
```
Collect the terminal output and staging evidence separately. Do not put provider secrets in logs or chat.
