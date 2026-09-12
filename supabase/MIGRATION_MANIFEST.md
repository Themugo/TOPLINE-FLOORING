# Topline Supabase Migration Set

The active `supabase/migrations/` directory is now the clean production sequence.

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

Historical/overlapping migrations are retained in `supabase/migrations_legacy/` for audit/reference and are **not** part of a fresh production deployment.

## Production rule

Do not reset or destroy a live Topline production database. Establish the clean baseline in a disposable/local environment first, lint/test it, then reconcile it against the dedicated Topline Supabase project before deployment.

21. `20260911180000_054_refunds_and_payment_reconciliation.sql` — refund requests and payment reconciliation.
22. `20260911190000_055_reservation_expiry_and_operations.sql` — reservation expiry and operational reconciliation.

23. `20260912000000_056_public_tracking_privacy.sql` — public tracking privacy.
24. `20260912010000_057_commerce_fulfillment_integrity.sql` — commerce fulfillment integrity.
25. `20260912020000_058_authorization_order_operations_360.sql` — authorization/order operations 360.
26. `20260912030000_production_infrastructure_rls_storage.sql` — production RLS, public intake boundaries and storage access controls.
