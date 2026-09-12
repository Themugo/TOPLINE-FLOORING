# Topline canonical database model

Topline Flooring & Waterproofing is a single-business application. The database is designed for one operating company, with Supabase Auth providing identity and the staff/RBAC layer providing authorization.

## Canonical domains

- **Catalogue:** categories, brands, products, variants, collections, media, specifications, tags, reviews.
- **Marketing/CMS:** site settings, navigation, theme, homepage sections, hero slides, testimonials, partners, promotions, SEO, FAQs, CMS content.
- **CRM:** leads, lead notes, reminders, customers, contacts, addresses, preferences, notes, communications and documents.
- **Commerce:** quotations, quotation items, orders, order items, coupons, delivery zones, deliveries.
- **Finance:** invoices, invoice items and payments.
- **Projects:** projects, project images/services, site visits and installations.
- **Procurement:** suppliers, purchase orders/items.
- **Inventory:** products/variants, warehouse stock, inventory movements, alerts and transfers; `materials`/`stock_movements` remain a distinct operational-material ledger rather than a duplicate customer catalogue.
- **Governance:** staff/RBAC and append-only activity logs.

## Deliberate convergence decisions

- `leads.name`, `leads.company`, and `leads.status` are canonical. Historical `customer_name`, `company_name`, and `lead_stage` are not recreated.
- `projects` is one entity containing both portfolio presentation and operational execution fields. The old competing project definitions are not recreated.
- `suppliers` and `purchase_orders` use the richer operational definitions; compatible fields from the earlier definitions are retained without creating duplicate tables.
- `products` is the canonical sellable catalogue. `materials` represents internal job/procurement materials and is not a second product catalogue.
- `inventory_movements` is the warehouse/product ledger. `stock_movements` is retained only for the separate material ledger.
- Order totals are authoritative database values: subtotal, delivery charge, discount and total are calculated server-side.
- The public quotation RPC atomically creates the CRM lead and quotation.

## Migration policy

`supabase/migrations/` now contains only the canonical forward chain. The previous prototype migrations are retained under `supabase/migrations_legacy/` for forensic reference and are **not** part of the deployment chain.

The canonical deployment chain currently contains 40 active migrations. The first four are:

1. `20260910000000_topline_canonical_schema.sql`
2. `20260910090000_032_commerce_contract_hardening.sql`
3. `20260910100000_033_staff_rbac_audit_foundation.sql`
4. `20260910110000_topline_rpc_contracts.sql`

The remaining migrations continue chronologically through the current `066`–`069` hardening/operations layer. See `supabase/MIGRATION_MANIFEST.md` for the complete active chain.

This baseline is intended for a new, dedicated Topline Supabase project. Do not apply the legacy directory to that project.

- `20260912220000_071_service_quality_warranty_feedback_360.sql` — Phases 83–85 Service Quality, Warranty Entitlement & Customer Feedback 360.

- `20260913000000_073_customer_renewal_orchestration_360.sql` — Phases 89–91 Customer Renewal Orchestration 360.
- `20260913010000_074_commercial_lifecycle_360.sql` — Operation 1 Commercial Lifecycle 360: lead → customer → quotation → order → project handoff.

- `20260913020000_075_project_delivery_360.sql` — Operation 2 Project Delivery 360: planning → workforce → materials → installation → progress → issues → cost → quality → customer sign-off.
