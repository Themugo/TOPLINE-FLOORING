# TOPLINE Customer Registration + Customer Dashboard Fix — 2026-10-02

## Scope
Implemented the requested customer lifecycle in this order:
1. Proper customer registration
2. Supabase Auth -> customer profile -> portal access
3. Safe post-registration/customer reconciliation
4. Dashboard refresh/retry
5. Immediate dashboard refresh after service requests
6. Authenticated error handling
7. Existing quotation/order/project/invoice detail views
8. Cross-account isolation verification

## Registration
- Added Supabase Auth password registration with required name, phone and optional company.
- Registration is explicitly marked with `topline_customer_registration` metadata.
- Database trigger creates a customer profile only for explicit Topline registrations.
- Existing unique customer email is reused instead of creating a duplicate profile.
- Ambiguous existing email matches are not automatically bound.
- Portal access still requires verified email.
- Existing active Auth/customer bindings are never silently rebound.
- Password sign-in is available alongside the existing secure email sign-in link.

## Portal identity boundary
- Customer dashboard data continues to resolve through `get_current_customer_id()` and the authenticated Auth identity.
- Portal RPC remains `SECURITY DEFINER` with an empty search path.
- Customer, quotation, order, project, invoice, service-case, visit and installation payloads remain customer-scoped.
- No browser-side customer-table writes were introduced.

## Dashboard UX
- Added manual Refresh action.
- Added retry screen for authenticated dashboard-load failures.
- Signed-in users are no longer silently pushed back to sign-in when portal data fails to load.
- Service-case submission refreshes the complete dashboard before reporting success.
- Quotation, order, project and invoice cards open detail dialogs.
- Quotation details now include line items.
- Order details include line items.
- Project details include status, location, progress and notes.
- Invoice details include totals, amount paid, balance, line items and PDF link where available.

## Verification
PASS:
- Customer Registration + Dashboard 360: 17/17
- Customer cross-account isolation: 12/12
- Customer Portal 360 source verification
- Customer Self-Service Trust Boundary: 14/14
- Application Security & Trust Boundary
- Migration integrity
- Database dependencies: 102 migrations / 153 tables / 220 functions / 277 FK references
- Ecommerce stability

## Runtime validation limitation
The package did not contain `node_modules`, so dependency-backed TypeScript, ESLint, production build and browser E2E were not claimed as passed. Those must be run in the real project environment with `npm ci` and the configured Supabase environment.

## Important live deployment gate
The previously observed Supabase transport timeout remains an external deployment gate. This package changes the local migration chain but does not claim that migration has been applied to production.
