# TOPLINE Guest Payment Resume — 2026-11-02

## Delivered
- Extended Track Order with a guest payment-resume panel for unpaid, non-cancelled orders.
- Reuses the existing private order lookup (order reference + checkout phone).
- Requires the checkout email and relies on the server-side `payment-initiate` order/email match before payment initiation.
- Uses enabled order payment methods and the persisted order ID; cart reconstruction is not required.
- Uses a per-order/per-gateway session idempotency key to reduce duplicate attempts from repeat clicks.
- Uses the existing secure provider redirect and token-protected payment-return flow.
- Added `verify:guest-payment-resume` with 12 static contract assertions.
- Added `docs/commerce/guest-payment-resume.md` with trust boundaries and UAT requirements.

## Verification
- `node scripts/verify-guest-payment-resume.mjs`: 12/12 passed.
- `npm run verify:all`: 135/135 verifier scripts passed, 0 failed.
- ZIP integrity check: passed.

## Security model and limitation
This is a multi-field guest verification flow, not an email OTP challenge. The order reference and checkout phone are verified by the existing `track_order_public` RPC. The supplied email is independently compared with the persisted order email by `payment-initiate`. This is safer than trusting browser-provided order IDs or email alone, but it is not equivalent to proving control of the email inbox. A true email OTP challenge requires server-side challenge storage, hashed codes, expiry, attempt limits, resend throttling, and monitored transactional email delivery; it is not represented as completed here.

## Not certified
No browser/device click-through, PostgreSQL migration replay, Supabase Edge Function deployment, provider sandbox, live payment, production database change, Vercel deployment, or GitHub push was performed. Build/typecheck/lint remain unverified because project dependencies are not installed in this workspace.

## UAT required
1. Wrong order reference or phone returns no order data.
2. Correct order/phone but wrong checkout email is rejected by payment-initiate.
3. Correct details show enabled order gateways and initiate against the original order.
4. Repeated clicks/reloads do not create duplicate provider charges.
5. Pending, delayed, failed, and successful provider callbacks reconcile correctly.
6. Paid and cancelled orders do not expose the recovery action.
