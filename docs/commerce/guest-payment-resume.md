# Guest payment resume

## Customer flow

A guest can open Track Order and prove access to an existing order using the order reference and checkout phone number through the existing `track_order_public` RPC. If the order is not fully paid and is not cancelled, the page offers payment recovery without rebuilding the cart. The customer supplies the checkout email, chooses an enabled order payment gateway, and resumes payment against the persisted order ID.

## Trust boundaries

- The public tracking RPC remains the first order lookup gate (order reference + checkout phone).
- `payment-initiate` independently compares the supplied email with the persisted order email before creating or replaying a payment attempt.
- Provider readiness checks, server-side provider secrets, gateway allow-listing, idempotency, and callback reconciliation remain in the existing payment initiation path.
- The browser does not mark an order paid. Provider callbacks remain authoritative.
- A per-order/per-gateway session idempotency key prevents repeated clicks from creating a second attempt in the same browser session.

## Important limitation

This is a multi-field guest verification flow, not an email OTP challenge. It relies on the order number and checkout phone already required by private order tracking, then checks the checkout email server-side before payment initiation. A dedicated email one-time-code challenge would require additional server-side challenge storage, rate limiting, email delivery monitoring, and expiry/replay controls; it is intentionally not simulated client-side.

## Acceptance checks

Run `npm run verify:guest-payment-resume` and `npm run verify:all`. Complete browser UAT with a test order: wrong phone must not reveal order details; correct order/phone plus wrong email must be rejected by `payment-initiate`; correct details must resume payment; repeated clicks must reuse the same attempt; provider callback must be the only source of paid status.

## Server-side payment-initiate guards (added 2026-11-02 production audit)

The browser hides the recovery panel for paid orders, but the endpoint is public, so the server enforces the same rules:

- `payment_status = paid` → 409 "This order is already paid" (no provider charge is started).
- `payment_status = refunded` → 409 (refunded orders cannot be re-paid; contact support).
- The charge amount is the **outstanding balance** (order total minus successful `payment_transactions`), not the full total, so a part-paid order cannot be overcharged.
- A new idempotency key (new browser session, second device, different gateway) is refused with 409 while another non-bank-transfer attempt for the same order/invoice is still pending (until its `checkout_expires_at`, or 3 minutes when the provider sets none). Bank-transfer instructions do not move money and are excluded.

UAT additions: (7) call `payment-initiate` for a paid order with valid email → 409; (8) start M-Pesa, then from another browser start Card for the same order within minutes → 409; (9) part-paid order → provider amount equals the remaining balance.
