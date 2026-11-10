# G-10 — Authentication Lifecycle Certification Report

**Status: OPEN — source contracts pass; live staging and browser acceptance remain outstanding.**

## Foundation and scope

This G-10 package is based on the G-09 UI/mobile browser certification ZIP and retains the existing `TOPLINE-FLOORING-main/` project root. The work audits the existing Supabase Auth customer and admin flows; it does not replace the identity provider, change production settings, or grant staff access.

Coverage includes customer registration, email confirmation, verification resend, password recovery, password update, session refresh, sign-out and subsequent sign-in. Admin coverage includes email-confirmation registration, invitation-based activation, active staff profile enforcement, permission-aware route guarding and unauthorized sign-out.

## Existing implementation findings

- Customer registration uses Supabase Auth `signUp`, normalizes email, and marks customer registration metadata explicitly.
- Signup confirmation is performed by an explicit token-hash `verifyOtp` action; verification can be resent.
- Customer password recovery uses `resetPasswordForEmail`; password updates use authenticated `updateUser`.
- Customer auth-state handling recognizes `PASSWORD_RECOVERY` and defers asynchronous work until the auth callback lock is released.
- Admin registration requires email confirmation. Sign-in checks for an active staff profile and attempts invitation acceptance for an invited user; identities without staff access are signed out.
- Admin route protection verifies the current Auth user and active staff profile, then checks the route permission. Auth callbacks are deferred and stale checks are invalidated.
- Existing customer auth-trigger ordering hardening ensures customer registration preparation precedes verified portal binding.

## Changes delivered

1. Added `scripts/run-g10-auth-uat.mjs`, an interactive live Supabase Auth lifecycle runner. It is gated to a separate staging Supabase project and staging app hostname, explicitly rejects the canonical project and production domain, and requires a dedicated disposable mailbox.
2. The runner exercises real signup, verification email token consumption, password sign-in, refresh, current-user resolution, recovery email, recovery token, password update, logout and sign-in with the new password.
3. The runner records sanitized evidence in `artifacts/g10-auth-uat/` without writing the password, anon key, access/refresh tokens, email tokens or callback URLs.
4. Added `scripts/verify-g10-auth-certification.mjs`, registered package commands and a CI source-contract step.
5. Added `docs/G-10-AUTHENTICATION-UAT-RUNBOOK.md` with Windows CMD instructions, admin acceptance and session/browser acceptance criteria.

## Verification performed in this workspace

| Check | Result |
|---|---:|
| G-10 source verifier | PASS — 22/22 |
| Existing customer auth lifecycle hardening | PASS — 15/15 |
| Existing email/registration communications contract | PASS — 20/20 |
| Existing customer registration/dashboard contract | PASS — 17/17 |
| Existing admin authentication/authorization contract | PASS — 19/19 |
| Runner and verifier JavaScript syntax | PASS |
| CI workflow contains G-10 verifier step | PASS |
| Fail-closed runner without staging opt-in | PASS — blocked with exit code 2 |

## Not executed / limitations

No staging Supabase URL, anon key, dedicated mailbox, staging app, disposable identity or real verification/recovery emails were supplied. The real staging lifecycle runner was therefore **not run**. No browser session persistence, cross-tab sign-out, admin invitation, disabled-staff, expired-link or physical-device session test is claimed as passed. This workspace also does not contain the installed project dependencies required to execute the live runner.

The runner verifies the Supabase Auth lifecycle at the SDK/API boundary. It does not replace the manual staging browser checks in the runbook, particularly actual application session restoration and multi-tab behavior.

## Safety and non-actions

- No production Supabase project or production app was contacted.
- No production Auth configuration, email templates, redirect allowlist, RLS policy, staff role or customer record was changed.
- No migration was added or pushed.
- No commit, push or deployment was performed.
- The live runner creates a disposable staging Auth user and customer fixture; cleanup must be performed explicitly after evidence review.

## Closure criteria

G-10 remains OPEN until the staging runner passes all lifecycle checks; admin unverified/uninvited/active/deactivated staff cases pass; session restoration, refresh, sign-out, cross-tab invalidation and expired/used token behavior are reviewed in a real browser; and sanitized evidence is reviewed. G-08 and G-09 retain their prior open gates until their own evidence is accepted.
