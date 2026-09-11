# TOPLINE FLOORING — Build Package

This package is the current end-to-end application source for the Topline Flooring & Waterproofing rebuild.

## What is included

- Public marketing site
- Materials ecommerce catalogue
- Product detail and comparison
- Cart and secure checkout
- Delivery zones
- Coupons/promotions
- Orders and tracking
- Customer portal
- CRM/leads/quotations
- Site visits
- Projects and field operations
- Installation workforce
- Inventory/warehouses/procurement
- Invoices/payments
- Project cost/profitability
- Warranty/after-sales
- CMS/media/SEO
- Admin portal/RBAC/audit
- Communication outbox
- System health/observability
- Clean active Supabase migration chain
- Legacy migration archive for forensic/reference purposes
- WordPress-to-new-platform migration boundary documentation

## Important

The source is implementation-complete for the current application scope, but production infrastructure is not certified by a frontend build alone.

Before production database deployment:

```cmd
npm install
npm run typecheck
npm run lint
npm run build
npm run verify:database-contract
npm run verify:database-dependencies
npm run verify:ecommerce-stability
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
npx supabase test db --local
npx supabase gen types typescript --local > src/types/database.ts
```

Then reconcile the linked Topline Supabase project:

```cmd
npx supabase login
npx supabase link --project-ref jypkhvknfgoqrhwzbdwi
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Do not reset the linked production database.

## Legacy operations

The existing WordPress/cPanel/email/DNS stack remains untouched until UAT and cutover approval. See `docs/TOPLINE_MASTER_ARCHITECTURE.md`.
