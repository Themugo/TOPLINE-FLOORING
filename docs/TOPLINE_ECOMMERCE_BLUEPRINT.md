# TOPLINE FLOORING — Ecommerce Blueprint

## Commercial models

### Direct materials sale

Catalogue → cart → secure checkout → payment → order → inventory → fulfilment → delivery → completion.

### Project/service sale

Lead → qualification → site visit → measurement → quotation → approval → invoice/payment → project → materials → installation → completion → warranty.

Both flows share customers, catalogue, communications, finance and audit.

## Checkout guarantees

The browser never determines the authoritative subtotal, delivery charge, coupon discount or final total.

The database:

- validates active products;
- reads the current price;
- validates delivery zones;
- validates coupons;
- creates the order transactionally;
- assigns an order number;
- records an idempotency key;
- creates stock reservations;
- keeps payment state separate from order state.

## Payment model

`payment_transactions` is provider-neutral. It supports M-Pesa, card, bank transfer, cash, cheque and other methods.

A future provider integration should:

1. create/attach a payment transaction;
2. send the provider request from a server-side function;
3. persist provider identifiers;
4. receive and verify the provider callback/webhook;
5. transition the transaction idempotently;
6. update order payment status;
7. convert inventory reservations only once.

Never place provider secrets in the browser.

## Inventory

A checkout reservation is held for 24 hours. Stock consumption occurs once the order becomes fully paid. A future scheduled worker should expire reservations and release them according to the final inventory policy.

## Future-ready extensions

- M-Pesa STK Push
- card gateway
- bank transfer reconciliation
- partial payments
- refunds
- split/partial fulfilment
- customer accounts
- saved addresses
- tax rules
- product bundles
- variant-level inventory
- warehouse allocation
- automated transactional email/SMS/WhatsApp
- delivery integrations

## Refund and provider boundary

Refunds are represented separately from successful payment transactions. Staff create a refund request through `create_order_refund_request`; a server-side provider adapter later completes it through `complete_order_refund`. Refunds are idempotent and cannot exceed the refundable successful-payment balance.

The public `payment-webhook` Edge Function is intentionally a guarded boundary. Until a concrete provider verifier is configured, it returns `501` and changes no payment state. This is deliberate: an unsigned or browser-supplied success event must never mark an order paid.

## Reservation operations

`expire_inventory_reservations()` expires reservations whose hold time has elapsed. It does not subtract stock because stock is consumed only when payment is successfully completed. The `expire-reservations` Edge Function provides the server-side execution boundary for a future scheduled invocation.
