# G-10 — Authentication Lifecycle UAT Runbook

## Scope

Certify real customer registration, email verification, password recovery, session refresh, sign-out and subsequent sign-in. Admin authentication is separately checked for email confirmation, active staff profile enforcement, invitation-based activation and unauthorized sign-out. This is a staging-only exercise.

## Safety requirements

- Use a separate Supabase staging project and a non-production staging application URL.
- Never use the canonical project ref `cvjmfplhdlfvqnnmzqcp`, the production domain, production staff/customer accounts, or production data.
- Use a dedicated disposable mailbox you control. The test sends a real confirmation email and a real recovery email.
- Use only the Supabase anon/publishable key. Never use a service-role key.
- The runner prompts for the `token_hash` from each email callback URL; do not paste the full callback URL into shared logs or tickets.
- Delete the disposable Auth user and its customer fixture after evidence has been reviewed. Do not delete any real customer or staff account.

## Windows CMD setup

Run from the project root. Replace each value with an actual value; do not include angle-bracket placeholders.

```cmd
set "TOPLINE_AUTH_UAT_ENV=staging"
set "TOPLINE_ALLOW_AUTH_UAT=true"
set "TOPLINE_AUTH_UAT_PROJECT_REF=your_20_character_staging_ref"
set "TOPLINE_AUTH_UAT_SUPABASE_URL=https://your_20_character_staging_ref.supabase.co"
set "TOPLINE_AUTH_UAT_ANON_KEY=your_staging_anon_or_publishable_key"
set "TOPLINE_AUTH_UAT_APP_URL=https://your-staging-app.example"
set "TOPLINE_AUTH_UAT_EMAIL=your_disposable_test_mailbox@example.com"
set "TOPLINE_AUTH_UAT_PASSWORD=your_disposable_initial_password_12_chars_minimum"

npm run verify:g10-auth-certification
npm run uat:g10-auth
```

The runner executes real Supabase Auth operations in order:

1. Register a disposable customer identity with customer-registration metadata.
2. Confirm registration does not create a session before email verification.
3. Verify the identity using the signup email's `token_hash`.
4. Sign in with the initial password.
5. Refresh the session and validate the current user.
6. Request password recovery and verify the recovery email token.
7. Set a new password, sign out, and sign in with the new password.
8. Sign out and confirm the local session is cleared.

## Admin acceptance (manual staging)

Use a separately invited staging staff identity; never self-grant staff roles to the customer test account. Verify:

- An unverified email cannot sign in.
- A verified but uninvited identity cannot enter `/admin` and is signed out.
- A verified identity with an active staff invitation/profile can sign in and only sees routes allowed by its assigned permissions.
- A deactivated staff profile loses access after refresh/navigation and cannot call protected data successfully.
- Admin password recovery returns to the configured recovery route and a changed password works on the next sign-in.

## Session acceptance

- Reload a customer page with a valid session and confirm session restoration.
- Confirm access-token refresh retains the same user identity.
- Sign out, reload and verify the protected portal returns to sign-in.
- Expired/invalid/used confirmation and recovery tokens show a safe recoverable error.
- Multiple tabs respond to sign-out/auth-state changes without retaining stale protected content.
- Confirm browser storage contains no service-role key and no application-defined plaintext password storage.

## Evidence and status

The live runner writes sanitized files to `artifacts/g10-auth-uat/`. It records project ref, application host, a one-way hash of the test email, user ID, check results and timestamps. It does not write passwords, anon key, tokens or callback URLs.

The live staging run has not been run in this workspace. Static source verification is not live authentication certification. G-10 remains OPEN until the staging runner passes, admin invitation/role acceptance is recorded, and browser session restoration, cross-tab sign-out and expired-link cases are reviewed. This runner creates a disposable auth user; cleanup is an explicit post-test task and is not automated.
