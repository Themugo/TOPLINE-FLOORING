# TOPLINE FLOORING — Master Architecture & Migration Boundary

## Principle

Topline is a single-business platform. The new application is the long-term system of record; the existing WordPress/cPanel stack remains live until the replacement is proven.

## System boundaries

| Layer | Current role | Target role | Migration rule |
|---|---|---|---|
| WordPress / Enfold | Live public legacy site | Reference/archive only | Do not modify until cutover |
| cPanel | Legacy hosting + email/website infrastructure | Legacy support or retirement | Migrate responsibilities independently |
| Business email | Existing operational communications | Client-owned dedicated mail | Move separately from website |
| DNS | Current domain routing | Client-controlled routing | Change last |
| GitHub | Application source | Canonical source control | Client ownership before handover |
| Supabase | New platform database/auth/storage | System of record | Dedicated Topline project only |
| Frontend hosting | New app | Production web delivery | Cut over only after UAT |
| Payment provider | Not assumed | Provider adapter + webhook | Client-owned account |
| Backups | JetBackup for legacy | Dual legacy + new-platform backup | Maintain overlap during migration |

## Safe migration sequence

1. Freeze destructive changes to the old site.
2. Build and validate the new application in staging.
3. Establish a dedicated Topline Supabase production environment.
4. Reconcile and validate the canonical schema.
5. Load approved catalogue/content/media.
6. Test ecommerce, quotes, delivery, inventory, finance and customer portal.
7. Run old and new systems in parallel.
8. Cut over DNS only after UAT and rollback checks pass.
9. Keep WordPress/cPanel/email available during the post-cutover observation period.
10. Retire legacy services individually, never as a single bundled migration.

## Rollback

DNS can be pointed back to the legacy site while the legacy hosting remains intact. New application data must never be deleted as part of a website rollback.

## Ownership

The client should own the domain, registrar, DNS, email, GitHub organization/repository, Supabase organization/project, hosting, payment accounts, storage and monitoring. Developers receive delegated access.

## WordPress source-of-truth policy

The legacy site is authoritative for currently published business facts until the client approves their new-platform equivalents. Do not invent product specifications, prices, warranties, coverage, certifications or project claims during migration.
