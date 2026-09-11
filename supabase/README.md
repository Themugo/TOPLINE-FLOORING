# Topline Supabase infrastructure

## Authoritative project

This repository is configured for the dedicated Topline Flooring & Water Roofing Supabase project:

- Organization: **Frameworks Suites**
- Project ref: `jypkhvknfgoqrhwzbdwi`
- API URL: `https://jypkhvknfgoqrhwzbdwi.supabase.co`

This project is completely independent of CALQULUS-PMS. Do not substitute the CALQULUS project ref or credentials.

## Migration chain

The active migration chain is intentionally canonical and ordered:

1. `20260910000000_topline_canonical_schema.sql` — normalized schema baseline.
2. `20260910090000_032_commerce_contract_hardening.sql` — commerce transaction hardening.
3. `20260910100000_033_staff_rbac_audit_foundation.sql` — authentication/RBAC/RLS/audit foundation.
4. `20260910110000_topline_rpc_contracts.sql` — canonical quotation/order RPC contracts.
5. `20260910120000_catalogue_inventory_procurement_engine.sql` — catalogue, inventory and procurement transactions.
6. `20260910130000_customer_portal_security.sql` — customer portal identity and private data access.
7. `20260910140000_sales_project_lifecycle.sql` — CRM, quotation, order and project lifecycle.
8. `20260910150000_project_delivery_field_operations.sql` — field delivery and completion operations.
9. `20260910160000_finance_communications_analytics.sql` — finance, communications and analytics.
10. `20260910170000_customer_journey_notifications.sql` — customer journey events and communication outbox.
11. `20260911080000_039_admin_mutation_security.sql` — staff-only catalogue/inventory mutations.
12. `20260911090000_040_communication_outbox_delivery.sql` — durable outbound communication state.
13. `20260911100000_041_system_health_observability.sql` — operational health snapshot.
14. `20260911110000_042_order_delivery_lifecycle.sql` — order payment state and delivery lifecycle.
15. `20260911120000_043_delivery_proof_and_customer_tracking.sql` — delivery proof and public tracking.
16. `20260911130000_045_installation_workforce.sql` — installation workforce controls.
17. `20260911140000_046_project_cost_ledger.sql` — project cost/profitability ledger.
18. `20260911150000_047_warranty_after_sales.sql` — warranty and after-sales service cases.
19. `20260911160000_048_ecommerce_stability_foundation.sql` — idempotent checkout, stock reservations and provider-neutral payments.

`migrations_legacy/` is forensic reference material and must not be deployed.

Use `npm run verify:phases-30-32` before database validation to catch migration-contract drift early.

## Safe activation workflow

The remote database is intentionally **not changed by Phase 5 in this repository build**. First establish the local CLI link, inspect the remote migration history, preview the push, and only then apply migrations.

```cmd
npx supabase login
npx supabase link --project-ref jypkhvknfgoqrhwzbdwi
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Only after reconciliation is approved:

```cmd
npx supabase db push --linked
```

Never run `supabase db reset --linked` against this project unless the database is explicitly treated as disposable.

## Client configuration

The browser application uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The legacy `VITE_SUPABASE_ANON_KEY` remains a compatibility fallback only. Never put a service-role or secret key in a Vite `VITE_*` variable.

## Type generation

Once remote schema reconciliation is complete, generate authoritative types from the linked project:

```cmd
npx supabase gen types typescript --linked > src/types/database.ts
```

Do not hand-author a production database type file when the remote schema is available.
