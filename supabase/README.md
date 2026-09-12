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
19. `20260911160000_048_ecommerce_stability_foundation.sql`
20. `20260911170000_049_payment_inventory_lifecycle_hardening.sql` — idempotent checkout, stock reservations and provider-neutral payments.


21. `20260911180000_054_refunds_and_payment_reconciliation.sql` — refund requests and payment reconciliation.
22. `20260911190000_055_reservation_expiry_and_operations.sql` — reservation expiry and operations.
23. `20260912000000_056_public_tracking_privacy.sql` — public tracking privacy controls.
24. `20260912010000_057_commerce_fulfillment_integrity.sql` — commerce fulfillment integrity.
25. `20260912020000_058_authorization_order_operations_360.sql` — authorization and order operations hardening.
26. `20260912030000_059_fulfillment_operations_360.sql` — fulfillment operations.
27. `20260912040000_launch_communications_worker.sql` — communications worker infrastructure.
28. `20260912050000_production_infrastructure_rls_storage.sql` — production infrastructure, RLS and storage.
29. `20260912100000_059_production_communications_worker.sql` — production communications worker controls.
30. `20260912110000_060_sms_customer_notification_operations.sql` — SMS/customer notification operations.
31. `20260912120000_061_field_operations_360.sql` — field operations.
32. `20260912130000_062_finance_billing_operations_360.sql` — finance and billing operations.
33. `20260912130100_062_sales_crm_360.sql` — sales and CRM operations.
34. `20260912140000_063_inventory_procurement_operations_360.sql` — inventory and procurement operations.
35. `20260912150000_064_customer_portal_360.sql` — customer portal.
36. `20260912160000_065_backup_export_operations_360.sql` — backup and controlled export operations.
37. `20260912170000_066_sales_project_lifecycle_360_hardening.sql` — sales/project lifecycle hardening.
38. `20260912180000_067_communications_provider_response_360.sql` — provider delivery and inbound response handling.
39. `20260912190000_068_finance_communications_analytics_360_hardening.sql` — finance/communications analytics hardening.
40. `20260912200000_069_reporting_operational_intelligence_360.sql` — reporting and operational intelligence.

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

21. `20260911180000_054_refunds_and_payment_reconciliation.sql` — refund requests and payment reconciliation.
22. `20260911190000_055_reservation_expiry_and_operations.sql` — reservation expiry and operational reconciliation.

Phase 3 adds `deliver-communications` plus service-role-only worker RPCs for real email/SMS delivery.

- `20260912210000_070_customer_service_sla_operations_360.sql` — Phases 80–82 Customer Service SLA & After-Sales Operations 360.
