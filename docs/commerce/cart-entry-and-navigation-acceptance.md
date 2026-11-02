# Cart Entry and Navigation Acceptance

Date: 2026-11-02

## Defect addressed

Public homepage product cards dispatched an item into shared cart state without taking the customer to the cart or providing an obvious completion path. Product-detail purchase actions also stayed on the detail page. This made the purchase controls appear unresponsive even though the shared cart reducer received the item. The mobile fixed action bar did not provide a dedicated Cart destination.

## Changes

- Homepage product purchase actions now use the shared `addToCart` API with the selected active variant and navigate to `/cart`.
- Product-detail purchase actions add the selected quantity and variant, then navigate to `/cart`.
- Shop purchase actions retain their existing add-and-open-cart behaviour.
- The persistent header cart action now includes a visible Cart label on wider screens.
- The mobile action bar now includes a dedicated Cart destination and a live item-count indicator.
- The commerce entry-point verifier now checks the homepage's actual `addToCart` contract rather than the retired `addItem` call.
- Stock eligibility, variant identity, authoritative checkout pricing, order RPC, payment and inventory rules remain unchanged.
- Customer payment selection now tracks the exact configured gateway key as well as the payment method. Selecting a second gateway that uses the same method (for example, a backup M-Pesa gateway) now updates the gateway sent to payment initiation. The same exact-gateway selection is wired for customer order and invoice payments in the portal.

## Verification

- `verify:shop-cart-end-to-end`: 19 assertions passed.
- `verify:cart-navigation-and-brand-uniformity`: 13 assertions passed.
- `verify:cart-stock-eligibility`: 6 assertions passed.
- `verify:shop-page`: 12 assertions passed.
- `verify:customer-commerce-pages`: 16 assertions passed.
- `verify:commerce-entrypoints-360`: passed.
- `verify:all`: 133/133 passed after the cart navigation and payment gateway selection changes.
- `verify:payment-gateway-selection`: 6/6 assertions passed.
- Added a Vitest regression case with two M-Pesa gateways to verify the selected gateway is used; execution of the Vitest suite remains pending because this packaged workspace has no `node_modules` installed.

## Scope and limitations

This is source-level and static contract acceptance. No production deployment, production database mutation, real payment or customer transaction was performed. Browser/device click-through acceptance still requires testing against the approved staging or production environment. Typecheck, lint and production build were not run because dependencies are not installed in this workspace. Products and variants with zero available stock correctly remain unavailable for cart checkout.
