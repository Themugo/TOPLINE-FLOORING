# TOPLINE FLOORING — Customer Self-Service RPC / Public Trust Boundary 360

## Status
**HARDENED — 360 source verification passed and migration applied to the dedicated production Supabase project.**

Canonical Supabase project: `zmbsskvnzjdaxuxlauyx`  
Canonical site: `https://toplineflooringandwaterproofing.co.ke`

## Scope
Reviewed the customer/public trust boundary across customer portal identity binding, portal reads, quotation intake, order checkout, public order tracking, coupon validation, service-case creation/feedback, notification preferences, and customer journey/maintenance RPCs.

## Key findings and fixes

1. **Customer/Auth identity binding risk — fixed**
   - The previous trigger could bind an Auth user to a customer solely from email before email confirmation and could automatically rebind an existing customer to a different Auth user.
   - The trigger now requires `email_confirmed_at`, requires a unique customer email match, never rebinds an active customer link, and links only on insert/confirmation.
   - An active Auth identity is now unique across customer portal links.

2. **SECURITY DEFINER search-path hardening — fixed**
   - Customer-facing SECURITY DEFINER RPCs now pin `search_path` to the empty path, preventing mutable-path object shadowing while preserving schema-qualified application objects.

3. **Quotation IDOR/cross-customer collision — fixed**
   - Portal quotation visibility now prefers `customer_id` ownership and only falls back to email matching for legacy, still-unlinked quotations.

4. **Checkout idempotency replay exposure — fixed**
   - Replays now require the same checkout email and phone. A reused key from another checkout is rejected instead of returning order metadata.
   - Authenticated linked customers now use their server-bound customer profile rather than creating a new customer record from client-supplied identity fields.

5. **Public quotation payload abuse — fixed**
   - Public quotation intake now bounds all free-text fields and retains anonymous execution intentionally.

6. **Coupon validation edge case — fixed**
   - Negative order totals are normalized to zero and computed discounts are clamped to a non-negative value.

7. **Customer-owned service-case controls — verified**
   - Service-case creation already enforced customer ownership for the customer path and validated project/order ownership and consistency.
   - Customer feedback already enforced resolved/closed status plus customer ownership and single-submission behavior.
   - These RPCs were additionally moved to the hardened empty search path.

8. **Public tracking boundary — verified**
   - Public tracking remains intentionally anonymous but requires both order number and checkout phone number; it does not expose arbitrary order lookup by UUID alone.

## Live database result
Migration applied successfully to `zmbsskvnzjdaxuxlauyx`. The remote migration history now contains **84 active migrations** and the new migration name `110_customer_self_service_rpc_trust_boundary_360`.

Live checks confirmed the new quotation ownership policy, customer-link uniqueness index, hardened RPC search paths, and retained anonymous execution for quotation intake, checkout, public tracking, and coupon validation.

## Source verification
`verify:customer-self-service-rpc-360`: **14/14 passed**  
`verify:all`: **86/86 passed, 0 failed**  
Migration integrity: **84 unique active migration timestamps**  
Database dependency contract: **84 migrations, 142 tables, 214 functions, 269 FK references**

## External gates still required
- Local Windows `npm ci`, `typecheck`, `lint`, and production build.
- Supabase linked dry-run from the user's Windows checkout before any future migration push.
- Production customer UAT with at least two distinct customer accounts, including an attempted cross-customer portal access test.
- Auth email-confirmation/linking UAT.
- Public quotation spam/rate-limit testing at the edge/WAF layer.

No secrets were added to the repository.
