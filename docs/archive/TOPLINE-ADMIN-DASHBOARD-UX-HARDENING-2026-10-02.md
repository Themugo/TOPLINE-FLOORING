# TOPLINE Admin Dashboard — UX & Control-Plane Hardening

Date: 2026-10-02

## Objective

Rework the existing admin workspace so a non-technical Topline business client can operate the business without being confronted by internal engineering, governance, database, automation, or infrastructure terminology.

The system administrator/developer retains access to all existing technical controls. No existing product capability or route was intentionally removed.

## Business-facing primary navigation

- Home
- Sales & Enquiries
- Orders
- Customers
- Products
- Services
- Categories
- Inventory
- Projects
- Site Visits
- Delivery
- Installation Team
- Project Profitability
- Warranty & Service
- Homepage
- Media Library
- Testimonials
- Website SEO
- Invoices
- Quotations
- Finance
- Reports
- Promotions
- Delivery Operations
- Suppliers
- Business Settings

## Secondary technical administration

The following remain available under `System Administration` and are deliberately not presented as day-to-day business tasks:

- System Health
- Audit Logs
- Identity & Access
- Backups
- Site Control Center
- Automation & Workers
- Reliability & Incidents
- Business Continuity
- Data Governance

## Dashboard behavior

The home dashboard now emphasizes:

1. What needs attention today.
2. Orders, open enquiries, active projects and outstanding invoices.
3. Simple quick actions for common business work.
4. Recent customer orders.
5. A clear link to the live website.
6. A collapsed explanation of the technical administration boundary.

Complex executive/operational 360 terminology is not used as the default landing experience.

## Integrity hardening included in this pass

- Restored migration-chain integrity to 101 uniquely timestamped active migrations.
- Removed the redundant duplicate project-document migration.
- Converted project-template persistence migration to additive hardening instead of redefining the canonical table.
- Updated the migration manifest to the current 101-migration chain.
- Hardened customer-export CORS to the canonical Topline origin.
- Hardened project-document deletion to remove authoritative metadata first, then retry Storage cleanup and report cleanup failures honestly.
- CMS no longer silently falls back to fabricated content on unavailable/error database reads.
- CMS cache updates occur only after successful persistence.
- Removed fabricated public CMS statistics and fictional project map defaults.
- Removed browser-local persistence and fabricated CRM alerts from the admin notification center.
- Preserved existing project/service/order/customer/database workflows.

## Verification

`node scripts/verify-all.mjs`

Result: **98/98 passed, 0 failed.**

Dependency-backed TypeScript/lint/build gates still require the Windows project environment with installed dependencies.
