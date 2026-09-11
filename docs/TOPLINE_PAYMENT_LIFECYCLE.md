# Topline Payment & Inventory Lifecycle

## Phase 51–53 contract

Topline separates payment provider integration from the browser and from the core order ledger.

### Rules

1. The browser never receives payment provider secrets.
2. Successful payments are recorded through the controlled payment RPC.
3. The same provider transaction ID or idempotency key cannot be processed twice.
4. A payment cannot exceed the remaining order balance.
5. A final payment is rejected if the order's stock reservation has expired or disappeared.
6. Stock is consumed exactly once when the order reaches `paid`.
7. Cancelling a paid or partially paid order is blocked until the refund/payment workflow exists.
8. Provider webhooks should call a server-side adapter and then the same transaction boundary; they must not write orders directly.
9. Reservation expiry must be scheduled by a trusted server-side worker/cron in production.

## Provider rollout order

Recommended first integration: M-Pesa, followed by card gateway and bank-transfer reconciliation. The exact provider remains a client decision.

Provider credentials belong to the client's payment account and server-side secret store. They must never be committed to GitHub or Vite environment variables exposed to the browser.

## Remaining production work

- Implement the selected provider Edge Function adapter.
- Verify and persist provider callbacks/webhooks idempotently.
- Add refunds and partial refunds.
- Schedule reservation expiry.
- Run local Supabase replay and database tests.
- Run UAT against the client-owned Supabase staging environment.
