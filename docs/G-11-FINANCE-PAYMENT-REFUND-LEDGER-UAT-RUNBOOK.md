# G-11 — Finance payment, refund and ledger reconciliation UAT

**Status: OPEN until sandbox provider actions and staging ledger evidence are reviewed.**

## Scope and source boundary

The existing finance model uses `payment_transactions` for order payment collection, `payment_refunds` for refund requests/outcomes, `payments` for invoice collections, `payment_provider_events` for provider webhook identity/replay tracking, `finance_control_events` for refund/reconciliation audit, and invoice lifecycle fields derived from `payments`. This UAT retains those canonical tables and RPCs.

The source audit confirms atomic payment-attempt reservation, idempotency, provider-event signature/replay controls, KES currency enforcement, refund-to-payment linkage, order-first refund locking, provider refund identity, refund outcome audit events, and order/invoice reconciliation. The inspected schema does not establish a separate double-entry general ledger or independently persisted provider-fee ledger. Fee settlement must not be marked reconciled based only on provider metadata or gross transaction rows; it requires a separately evidenced fee source and accounting mapping.

## Safety

- Run only against a dedicated staging Supabase project and provider sandbox.
- The runner rejects the canonical `supabase/config.toml` project ref and requires the linked CLI ref and database hostname to match the supplied staging ref.
- The SQL is read-only, uses `BEGIN`/`ROLLBACK`, and validates already-completed sandbox fixtures. It does not initiate charges, create refunds, mutate ledger rows, or run migrations.
- Never paste database URLs, passwords, service-role keys, webhook secrets, card data, or customer PII into reports or chat.
- Keep test orders, customer accounts and provider sandbox identifiers disposable and clearly labelled.

## Provider sandbox execution before reconciliation

Using the provider's own sandbox dashboard/API and the staging application, complete and retain provider-side evidence for:

1. Successful payment (including exact amount, KES currency, provider transaction ID and event/callback identity).
2. Failed payment and a duplicate callback/replay attempt; verify no second successful transaction is created.
3. Partial payment where supported; confirm order balance remains outstanding.
4. Full/partial refund and provider refund identity; confirm only provider-confirmed success is treated as successful.
5. Failed refund and replay; verify failure remains auditable and does not reduce the paid balance.
6. Invoice payment and partial/full collection; confirm invoice amount paid and status.
7. Reconciliation run; verify order/invoice aggregates agree with canonical ledger rows and no over-refund/overpayment exists.

Record sandbox transaction IDs and exact fixture IDs in the private operator worksheet. Do not put credentials in the worksheet.

## Windows CMD — live read-only staging ledger evidence

Install/use PostgreSQL `psql`, link Supabase CLI to the isolated staging project, and set the variables below with real values (do not type angle-bracket placeholders literally):

```cmd
set "TOPLINE_FINANCE_UAT_ENV=staging"
set "TOPLINE_ALLOW_FINANCE_UAT=true"
set "TOPLINE_FINANCE_STAGING_PROJECT_REF=your_20_character_staging_ref"
set "TOPLINE_FINANCE_STAGING_DATABASE_URL=your_staging_database_connection_string"
set "TOPLINE_G11_ORDER_ID=actual_order_uuid"
set "TOPLINE_G11_PAYMENT_TRANSACTION_ID=actual_payment_transaction_uuid"
set "TOPLINE_G11_REFUND_ID=actual_refund_uuid"
set "TOPLINE_G11_INVOICE_ID=actual_invoice_uuid"
set "TOPLINE_G11_EXPECTED_PAYMENT_AMOUNT=1000.00"
set "TOPLINE_G11_EXPECTED_REFUND_AMOUNT=250.00"
set "TOPLINE_G11_EXPECTED_REFUND_STATUS=successful"
set "TOPLINE_G11_PROVIDER_TRANSACTION_ID=actual_sandbox_provider_transaction_id"
set "TOPLINE_G11_PROVIDER_REFUND_ID=actual_sandbox_provider_refund_id"
set "TOPLINE_G11_EXPECTED_INVOICE_PAID=500.00"

npm run verify:g11-finance-uat
npm run uat:g11-finance
```

For a failed-refund fixture, set `TOPLINE_G11_EXPECTED_REFUND_STATUS=failed` and leave `TOPLINE_G11_PROVIDER_REFUND_ID` unset if no provider refund ID exists. Amounts are exact expected fixture values, not suggestions. Invoice ID refers to an invoice with matching `payments` rows.

The runner writes `artifacts/g11-finance-uat/g11-finance-uat-summary.json`, `g11-finance-uat.log` and the rendered SQL. The SQL includes fixture identifiers and provider transaction references; redact these where needed before sharing externally. It does not log the database URL/password.

## Additional manual acceptance

- Verify duplicate provider event with identical payload is idempotent; same provider event ID with a different payload hash is rejected.
- Verify overpayment and over-refund attempts fail closed.
- Verify repeated refund completion with the same provider refund identity is idempotent; different identity is rejected.
- Verify a partial amount refunded in full is shown as refunded against the amount actually paid, not the full order value.
- Verify reconciliation corrections create finance audit events.
- Verify fee amount, net settlement and payout/bank settlement against a provider settlement statement. Current inspected schema does not prove a distinct fee ledger; keep this acceptance marked NOT IMPLEMENTED/NOT VERIFIED until a canonical fee ledger is identified and reconciled.
- Verify reversal/chargeback status and provider evidence. Do not equate a local status label with provider settlement reversal.

## Closure evidence

G-11 remains OPEN until successful and failed sandbox payment/refund cases, duplicate/replay behavior, partial/full payment/refund, invoice collection, provider settlement/reversal and ledger reconciliation have dated evidence. Finance owner must sign off totals and fee treatment. The read-only SQL runner alone is not full provider UAT.
