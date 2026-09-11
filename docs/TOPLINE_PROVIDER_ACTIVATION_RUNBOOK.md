# Topline Payment Provider Activation Runbook

## Before implementation

The client must choose the payment provider and own the provider account. For the Kenyan rollout, M-Pesa is the recommended first candidate, but the provider remains a client decision.

Required provider-side information is collected only after selection:

- sandbox/production endpoint details;
- merchant/business identifier;
- server-side credentials/secrets;
- callback/webhook URL requirements;
- signature or authentication method;
- supported currencies and payment methods;
- refund and reversal capabilities.

## Implementation boundary

1. Add a concrete server-side adapter under the payment Edge Function boundary.
2. Verify provider signatures before parsing an event as trusted.
3. Normalize provider events into the existing `ProviderWebhookEvent` contract.
4. Resolve the order using trusted provider metadata; never trust a browser-supplied order status.
5. Use the existing payment transaction RPC for idempotent ledger mutation.
6. Store the provider transaction ID for replay protection.
7. Keep refunds on the existing refund transaction boundary.
8. Return provider-safe responses without exposing credentials or internal errors.

## UAT cases

- successful payment;
- failed payment;
- duplicate callback;
- callback with invalid signature;
- overpayment attempt;
- payment against cancelled order;
- payment after reservation expiry;
- full refund;
- partial refund;
- duplicate refund request;
- provider reversal.

Production credentials are entered into the client's server-side secret store only. They are never committed to the repository and never exposed as `VITE_*` variables.
