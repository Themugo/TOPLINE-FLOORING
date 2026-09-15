# TOPLINE — Brevo / Site Control Runtime Hardening 360

## Root causes fixed

1. `brevo-test-email` did not answer browser CORS preflight requests. The browser therefore blocked the POST before JWT/staff authorization or Brevo delivery.
2. The public design-token and site-settings reads could inherit an authenticated browser session and return 401 when that session was stale. Public presentation reads now use a non-session Supabase client.
3. The Brevo test function now returns CORS headers on success and error responses, records test status in `site_integration_configs`, and keeps JWT + active-staff + `settings.update`/`settings.insert` authorization intact.
4. The payment webhook signature helper uses the resolved provider secret and fails closed when the provider secret is absent.

## Browser origins allowed by the test function

- http://localhost:3000
- http://127.0.0.1:3000
- https://toplineflooringandwaterproofing.co.ke
- https://www.toplineflooringandwaterproofing.co.ke

No wildcard origin is used.

## Secret boundary

`BREVO_API_KEY` remains an Edge Function/Supabase secret. No API key is exposed to browser code, `.env.example`, migrations, or this package.

## Deployment

From the repository root after extracting this package:

```cmd
supabase functions deploy brevo-test-email --project-ref zmbsskvnzjdaxuxlauyx
```

Keep JWT verification enabled. Do not use `--no-verify-jwt`.

The public-read SQL in `supabase/hardening/20260915_brevo_cors_public_site_control_hardening.sql` has already been applied to the dedicated Topline Supabase project during this repair. Keep it as the reproducible operational hardening record.

## Verification

- Brevo contract verifier: 14/14 passed.
- Phase 30–32 migration/security verifier: 88 active migrations passed.
- The final Windows lint/typecheck/build must be run from the user's Windows working copy because this package runner cannot reproduce the user's Windows toolchain/network environment.
