# Topline Supabase Migration Set

The active `supabase/migrations/` directory is the deployable production sequence. Every active migration has a unique timestamp/version.

## Active order

1. `20260910000000_topline_canonical_schema.sql` — clean Topline baseline
2. `20260910090000_032_commerce_contract_hardening.sql`
3. `20260910100000_033_staff_rbac_audit_foundation.sql`
4. `20260910110000_topline_rpc_contracts.sql`
5. `20260910120000_catalogue_inventory_procurement_engine.sql`
6. `20260910130000_customer_portal_security.sql`
7. `20260910140000_sales_project_lifecycle.sql`
8. `20260910150000_project_delivery_field_operations.sql`
9. `20260910160000_finance_communications_analytics.sql`
10. `20260910170000_customer_journey_notifications.sql`
11. `20260911080000_039_admin_mutation_security.sql`
12. `20260911090000_040_communication_outbox_delivery.sql`
13. `20260911100000_041_system_health_observability.sql`
14. `20260911110000_042_order_delivery_lifecycle.sql`
15. `20260911120000_043_delivery_proof_and_customer_tracking.sql`
16. `20260911130000_045_installation_workforce.sql`
17. `20260911140000_046_project_cost_ledger.sql`
18. `20260911150000_047_warranty_after_sales.sql`
19. `20260911160000_048_ecommerce_stability_foundation.sql`
20. `20260911170000_049_payment_inventory_lifecycle_hardening.sql`
21. `20260911180000_054_refunds_and_payment_reconciliation.sql`
22. `20260911190000_055_reservation_expiry_and_operations.sql`
23. `20260912000000_056_public_tracking_privacy.sql`
24. `20260912010000_057_commerce_fulfillment_integrity.sql`
25. `20260912020000_058_authorization_order_operations_360.sql`
26. `20260912030000_059_fulfillment_operations_360.sql`
27. `20260912040000_launch_communications_worker.sql`
28. `20260912050000_production_infrastructure_rls_storage.sql`
29. `20260912100000_059_production_communications_worker.sql`
30. `20260912110000_060_sms_customer_notification_operations.sql`
31. `20260912120000_061_field_operations_360.sql`

`supabase/migrations_legacy/` is forensic reference material and is not part of a fresh production deployment.

## Production rule

Do not reset or destroy a live Topline production database. Establish the clean baseline in a disposable/local environment first, lint/test it, then reconcile it against the dedicated Topline Supabase project before deployment.

## Safe activation workflow

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

Never run `supabase db reset --linked` against a live project.

## Client configuration

The browser application uses:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put a service-role or worker secret in a `VITE_*` variable.

- 20260912130000_062_finance_billing_operations_360.sql — Phase 10 Finance & Billing Operations 360

- 20260912140000_063_inventory_procurement_operations_360.sql — Phase 11 Inventory & Procurement Operations 360
- 20260912150000_064_customer_portal_360.sql — Phase 12 Customer Portal 360
- 20260912130100_062_sales_crm_360.sql — Phase 9 Sales & CRM Operations 360


## Current active chain (Phases 30–32 verification baseline)

The current production candidate contains 52 uniquely timestamped active migrations, ending with `20260913080000_081_executive_operations_control_360.sql`. Run the complete verification suite before any linked database deployment.

- `20260912210000_070_customer_service_sla_operations_360.sql` — Phases 80–82 Customer Service SLA & After-Sales Operations 360.

- `20260912230000_072_maintenance_retention_360.sql` — Phases 86–88 maintenance, renewal and retention operations 360.

- `20260913000000_073_customer_renewal_orchestration_360.sql` — Phases 89–91 Customer Renewal Orchestration 360.

- `20260913020000_075_project_delivery_360.sql` — Operation 2 Project Delivery 360: planning → workforce → materials → installation → progress → issues → cost → quality → customer sign-off.

- `20260913070000_080_communications_customer_journey_360.sql` — Operation 7 Communications & Customer Journey 360.

- `20260913080000_081_executive_operations_control_360.sql` — Operation 8 Executive Operations & Control Centre 360
