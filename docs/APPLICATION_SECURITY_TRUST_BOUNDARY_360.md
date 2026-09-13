# Application Security & Trust Boundary 360

## Objective
Harden the application boundary between browsers, authenticated staff, customer portal users, public website callers, worker jobs, webhooks and the production database without weakening legitimate business workflows.

## Scope completed
- RPC privilege boundary review and least-privilege tightening.
- Internal/trigger-only SECURITY DEFINER functions removed from client EXECUTE privileges.
- Legacy anonymous checkout RPC removed from the anonymous surface; secure idempotent checkout remains the intended public path.
- Finance payment reconciliation upgraded from finance read to finance update authority.
- Customer portal RPCs explicitly removed from anonymous execution.
- Communication worker RPCs removed from anon/authenticated direct execution; Edge workers use service-role execution.
- WhatsApp webhook now verifies Meta `x-hub-signature-256` using `WHATSAPP_APP_SECRET` and validates the configured phone-number ID when present.
- Reservation-expiry Edge Function now requires `x-topline-worker-secret`.
- Customer-data-export is configured for Supabase JWT verification.
- Static trust-boundary regression verifier added.

## Live database result
Migration 094 was applied directly to the client-owned Supabase project during implementation.

Post-hardening advisor state:
- Anonymous SECURITY DEFINER warnings: **4** — the four intentional public website RPCs: secure checkout, quotation submission, order tracking, coupon validation.
- Authenticated SECURITY DEFINER warnings: **178** — retained application RPC surface; these require the signed-in user to pass the function's internal RBAC/customer boundary checks. They are not blanket-authorized merely because they are callable.

## Authorization model certification
The canonical staff authorization primitives are:
- `private.current_user_has_permission(resource, action)`
- `private.require_staff_permission(resource, action)`
- active-staff membership is required by the canonical permission functions.

A live inspection found 148 authenticated SECURITY DEFINER functions explicitly calling `require_staff_permission`, 20 using `current_user_has_permission`, and the remaining authenticated functions are customer/public compatibility or identity-bound helpers rather than unrestricted staff mutation endpoints.

## Edge security boundary
Webhook functions intentionally do not use Supabase JWT verification because they are provider callbacks. They instead use provider/worker-specific secrets or signatures. Payment webhook remains fail-closed and returns HTTP 501 until a concrete provider adapter can verify the provider signature and normalize the event.

## Deployment
The repository migration is:
`supabase/migrations/20260913170000_094_application_security_trust_boundary_360.sql`

The user should deploy the repository migration through the normal linked Supabase CLI flow before committing the package:

```cmd
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npx supabase db push --linked
npm run verify:migration-deployment-static
npm run verify:application-security-trust-boundary
```

Edge functions should be deployed only after their client-owned secrets are configured. Do not put service-role keys in the browser application.

## Rollback
Migration 094 is least-privilege and does not modify business rows. Reversal is privilege-specific and must be evidence-driven. Do not restore blanket `PUBLIC`/`anon` execution. If a legitimate workflow is found to depend on a revoked RPC, restore only the exact role/function pair after authorization has been verified.

## Next security wave
The remaining authenticated SECURITY DEFINER surface is deliberately retained for compatibility, but the next security pass should certify each RPC against a matrix of role, resource, ownership, state transition and cross-customer access. That certification should be performed before enabling additional external integrations or exposing new staff portals.
