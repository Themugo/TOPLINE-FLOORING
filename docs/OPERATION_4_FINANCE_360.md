# Operation 4 — Finance 360

## Scope
Order payment → payment verification boundary → invoice → collections → refunds → reconciliation → finance reporting.

## Server authority
Finance mutations use protected RPCs. Invoice collection state is recalculated from the payment ledger. Order payment status is reconciled from successful payment transactions and successful refunds. Public/anonymous execution of the reconciliation and finance snapshot RPCs is revoked.

## Provider boundary
`supabase/functions/payment-webhook` remains fail-closed until a real payment provider adapter verifies signatures and normalizes provider events. Browser-supplied success cannot mark an order paid.

## Validation
Run local Supabase replay before remote deployment. Then use `npx supabase link --project-ref zmbsskvnzjdaxuxlauyx`, `npx supabase migration list --linked`, and `npx supabase db push --dry-run --linked`. Never run `db reset --linked` against the production project.
