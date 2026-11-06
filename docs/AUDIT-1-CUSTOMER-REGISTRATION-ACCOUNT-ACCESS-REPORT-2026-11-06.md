# TOPLINE FLOORING — PHASE 1 CUSTOMER REGISTRATION & ACCOUNT ACCESS AUDIT

**Date:** 2026-11-06  
**Authoritative foundation:** `TOPLINE-FLOORING-DEEP-ADMIN-FLOW-REPAIRS-2026-11-06.zip`  
**Phase:** 1 — Customer registration, authentication and account lifecycle  
**Disposition:** **PARTIALLY COMPLETE — source repairs and static verification passed; live Auth/database/browser certification remains blocked.**

## 1. Scope audited

Traced the existing customer and staff authentication implementation across:
- Customer registration and metadata.
- Supabase Auth sign-in (password and magic link).
- Email confirmation and resend.
- Scanner-proof token-hash confirmation.
- Password reset and password update.
- Customer portal account linking and legacy account claim.
- Customer dashboard authentication and private data loading.
- Staff invitation acceptance and role assignment.
- Admin sign-in, profile verification, permission checks and inactivity timeout.
- Auth state listeners, session transitions, sign-out and stale async request handling.
- Relevant Auth triggers, SECURITY DEFINER RPCs, RLS and migration manifest.

No new account model, authentication provider, duplicate customer table or redesigned login journey was introduced.

## 2. Confirmed defects and corrections

### P1-01 — Auto-confirmed registration could miss the customer portal link (database trigger ordering)
**Severity:** High; conditional on projects/configurations where Supabase confirms an email during the initial Auth user INSERT.

The existing migration creates two `AFTER INSERT` triggers on `auth.users`:
- `on_auth_user_customer_portal`
- `on_auth_user_customer_registration`

PostgreSQL fires triggers for the same event alphabetically by trigger name. `customer_portal` sorts before `customer_registration`. For an Auth user whose `email_confirmed_at` is already populated at INSERT time, the portal-link trigger could run before the registration trigger creates the matching `customers` row. No later email-confirmation UPDATE is guaranteed in an auto-confirmed flow.

The portal's self-service claim RPC provides a recovery path, but the trigger order itself was fragile and could produce a confusing first-login/dashboard recovery path.

**Repair:** Added migration `20261106120000_customer_auth_trigger_order_hardening.sql`. It drops the old portal trigger and recreates it as `on_auth_user_z_customer_portal`, ensuring the registration trigger executes first on INSERT. The renamed trigger continues to handle `UPDATE OF email_confirmed_at` for normal email-confirmation flows.

### P1-02 — Customer dashboard requests could race across sign-in/sign-out
**Severity:** High; private-data state consistency.

`loadDashboard()` could be started by initial mount and multiple Auth state events. An earlier, slower request could resolve after sign-out or a subsequent identity change and write the earlier customer's private dashboard data back into component state.

**Repair:** Added a monotonically increasing request ID to the customer portal dashboard loader. Only the latest request may update state. Pending requests are invalidated on component unmount. Signing out clears customer data, payment accounts, documents, preferences, communications and timeline state.

### P1-03 — Auth methods were called from inside the Supabase Auth callback lock
**Severity:** Medium/High; can cause auth callback lock contention or deadlock.

The customer portal Auth listener called `loadDashboard()` directly. That function immediately calls `supabase.auth.getSession()`. The admin auth hook similarly initiated a Supabase profile RPC directly from its Auth callback.

**Repair:** Both listeners now defer follow-up Supabase work with `window.setTimeout(..., 0)`, after the Auth callback returns and releases its internal lock. Cleanup guards prevent scheduled callbacks from running after unmount.

### P1-04 — Admin profile checks could complete out of order
**Severity:** High; authorization UI consistency.

Multiple Auth events could start concurrent staff-profile checks. A slow earlier profile check could complete after a later sign-out or identity change and restore stale staff authorization state.

**Repair:** Added a request sequence guard in `useAdminAuth`. Stale profile checks are ignored, sign-out clears the staff state, and unmount invalidates outstanding checks.

### P1-05 — Admin route guard could apply stale authorization results
**Severity:** High; authorization UI consistency.

The route guard could have multiple asynchronous identity/permission verifications in flight. An older result could overwrite a newer session state.

**Repair:** Added a verification sequence guard to `AdminAuthGuard`; sign-out timeout and unmount invalidate earlier checks.

### P1-06 — Admin sign-in could leave the UI stuck after a thrown network failure
**Severity:** Medium; account access reliability.

`useAdminAuth.login()` handled Supabase returned errors but did not wrap the initial sign-in call in a catch for thrown transport/runtime errors. The login page awaits this function and could leave its loading state active if the call threw.

**Repair:** Wrapped the sign-in and staff invitation/profile sequence in error handling, normalized the email address, and returned a clear retryable connection message. The login page can now finish its loading state on this failure path.

## 3. Existing controls inspected and preserved

- Customer registration uses Supabase Auth `signUp`.
- Registration metadata explicitly marks Topline customer registration.
- Name and phone are required by the customer registration trigger.
- Customer email is normalized to lowercase.
- Customer portal access is bound only after email confirmation and a unique normalized customer email match.
- Ambiguous duplicate customer email records are not auto-bound.
- An active identity is not silently rebound to a different customer.
- The portal claim RPC requires an authenticated, verified identity.
- Email-link confirmation uses explicit token-hash verification after the user presses the confirmation button; opening the link alone does not spend the token.
- Password-reset responses are neutral to reduce account enumeration.
- Marketing email consent is explicitly opt-in and stored as a boolean metadata value; separate consent-sync migrations were preserved.
- Staff access remains invitation-based: sign-in alone does not grant staff access; the confirmed email must match an open invitation, which assigns the invited role.
- Admin route guard still requires a valid Auth user, active staff profile and server-derived permissions.
- Existing RLS and SECURITY DEFINER boundaries were not weakened.

## 4. Files changed

- `src/pages/portal.tsx`
- `src/hooks/use-data.ts`
- `src/components/admin/AdminGuard.tsx`
- `supabase/migrations/20261106120000_customer_auth_trigger_order_hardening.sql`
- `supabase/MIGRATION_MANIFEST.md`
- `scripts/verify-customer-auth-lifecycle-hardening.mjs`
- `docs/MASTER-WORKFLOW-REGISTER.csv`
- `docs/MASTER-WORKFLOW-REGISTER.json`
- This report

## 5. Verification evidence

| Verification | Result |
|---|---:|
| Customer auth lifecycle hardening assertions | 15/15 PASS |
| Existing customer registration/dashboard contract | 17/17 PASS |
| Existing admin authentication/authorization 360 checks | 16/16 PASS |
| Application security trust-boundary static verifier | PASS |
| Migration integrity verifier | PASS |
| Full aggregate static verification | **151/151 PASS, 0 failures** |
| ZIP integrity after packaging | PASS |

The aggregate suite now includes the new `verify-customer-auth-lifecycle-hardening.mjs` check and recognizes 148 active migrations.

## 6. Blocked runtime certification

The previous dependency installation attempt was interrupted after the environment's 60-second execution limit. `node_modules` exists only partially; the required executables are absent:
- `node_modules/typescript/bin/tsc`
- `node_modules/vitest/vitest.mjs`
- `node_modules/eslint/bin/eslint.js`
- `node_modules/vite/bin/vite.js`

Therefore these were not run successfully:
- `npm ci` complete install.
- `npm run typecheck`.
- `npm run lint`.
- `npm run build`.
- `npm run test:smoke`.

No local PostgreSQL/Supabase migration replay was possible. The new migration has not been applied to the linked Supabase project. No actual confirmation email, reset email, magic link, staff invitation or live session was exercised with real provider credentials.

## 7. Required staging acceptance matrix

Before marking Phase 1 fully VERIFIED, run these against a disposable/staging Supabase project and real browser sessions:

1. New customer registration with email confirmation enabled.
2. Confirm registration token-hash manually; ensure customer row and active portal link exist.
3. New customer registration with email auto-confirm enabled; verify the trigger-order migration links the account on initial Auth INSERT.
4. Duplicate Auth email attempt; verify neutral response and no duplicate customer.
5. Existing CRM customer with unique email; verify safe binding only after confirmation.
6. Duplicate CRM customer email; verify no automatic binding and clear recovery route.
7. Expired and replayed signup token.
8. Resend verification and provider rate limit.
9. Password sign-in with uppercase/mixed-case email.
10. Unverified email sign-in.
11. Magic-link sign-in and explicit token confirmation.
12. Password reset, expired reset link and password update.
13. Sign out while dashboard requests are pending; verify no private data reappears.
14. Rapid sign-in/sign-out and identity switching; verify stale requests cannot restore prior data.
15. Staff invite acceptance, expired/revoked invite and unauthorized staff sign-in.
16. Inactive staff account and insufficient permission route.
17. Network interruption during admin login; verify spinner clears and retry works.
18. Customer A cannot access Customer B's portal records or documents.
19. Anonymous user cannot call authenticated portal RPCs.
20. Verify audit events and Auth state on actual mobile and desktop browsers.

Use test-only accounts and non-production data. Do not test by changing real customer accounts.

## 8. Phase 1 disposition

**Source-level corrections:** completed.  
**Targeted static checks:** passed.  
**Full aggregate static checks:** 151/151 passed.  
**Database migration replay:** pending.  
**Real Supabase Auth and email provider tests:** pending.  
**Browser/mobile E2E:** pending.  
**Phase 1 status:** PARTIALLY COMPLETE — not yet production-certified.

Per the master protocol, Phase 2 must not begin until the Phase 1 runtime and staging acceptance gates are completed. No production database, live customer data, provider configuration or deployment was modified. No Git commit or push was performed.
