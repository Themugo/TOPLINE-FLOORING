# Phase 0 — Application Route Inventory

Generated from `src/App.tsx` in the Phase 0 foundation audit.

## Public/customer routes

- `/` — home
- `/about`
- `/cart`
- `/checkout-success`
- `/compare`
- `/contact`
- `/faq`
- `/industries`
- `/market`
- `/payment-return`
- `/portal`
- `/portfolio`
- `/quotation`
- `/services`
- `/shop`
- `/track-order`

## Public admin authentication route

- `/admin/login` — public admin authentication route

## Dynamic public routes

- `/order-confirmation/<parameter>`
- `/page/<parameter>`
- `/product/<parameter>`
- `/service/<parameter>`

## Protected administrative routes

- `/admin` — protected dashboard
- `/admin/orders`
- `/admin/sales`
- `/admin/commercial-lifecycle`
- `/admin/operations`
- `/admin/executive-operations-360`
- `/admin/crm`
- `/admin/services`
- `/admin/invoices`
- `/admin/finance`
- `/admin/finance-operations`
- `/admin/inventory-procurement-operations`
- `/admin/customer-portal-operations`
- `/admin/suppliers`
- `/admin/warehouses`
- `/admin/products`
- `/admin/categories`
- `/admin/customers`
- `/admin/quotations`
- `/admin/hero-slides`
- `/admin/testimonials`
- `/admin/partners`
- `/admin/settings`
- `/admin/site-settings`
- `/admin/theme`
- `/admin/homepage`
- `/admin/delivery-zones`
- `/admin/projects`
- `/admin/site-visits`
- `/admin/project-delivery`
- `/admin/promotions`
- `/admin/inventory`
- `/admin/media-library`
- `/admin/reports`
- `/admin/seo`
- `/admin/coupons`
- `/admin/product-brands`
- `/admin/product-images`
- `/admin/product-specifications`
- `/admin/product-variants`
- `/admin/product-documents`
- `/admin/navigation`
- `/admin/backups`
- `/admin/audit-logs`
- `/admin/leads`
- `/admin/communications`
- `/admin/communications-journey-360`
- `/admin/system-health`
- `/admin/reliability-operations-360`
- `/admin/automation-operations-360`
- `/admin/business-continuity-360`
- `/admin/data-governance-360`
- `/admin/identity-access-360`
- `/admin/quality-assurance-360`
- `/admin/hse-site-compliance-360`
- `/admin/deliveries`
- `/admin/installation-workforce`
- `/admin/field-operations`
- `/admin/project-profitability`
- `/admin/project-delivery-360`
- `/admin/service-cases`
- `/admin/maintenance-plans`
- `/admin/customer-renewals`
- `/admin/customer-lifecycle-360`
- `/admin/supply-chain-360`
- `/admin/fulfillment-delivery-360`
- `/admin/site-control`
- `/admin/pages`
- `/admin/site-content`
- `/admin/about-page`

Route inventory counts: 16 explicit public/customer routes including `/`; 4 dynamic public route prefixes; 69 mapped admin child routes plus `/admin` dashboard; `/admin/login` is a separate public authentication route.

This is a source routing inventory, not proof that every route has passed a real browser journey or a role-specific authorization test.
