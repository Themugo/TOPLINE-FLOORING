# Phase 5 — Production Hosting, Domain & Release Engineering

## Objective

Prepare Topline Flooring & Waterproofing for a controlled production web launch without moving the existing business email or replacing the live WordPress site before the new application is proven.

## Production topology

```text
Customer browser
      |
      v
Vercel — React/Vite production frontend
      |
      +---- HTTPS ----> Dedicated Topline Supabase
      |
      +---- transactional delivery boundary ----> Brevo / Africa's Talking

Topline domain/DNS
      |
      +---- web ----> Vercel
      +---- existing human mail ----> cPanel (temporary)
```

The website and business operating system are independent of cPanel hosting. cPanel human mail remains untouched during the web cutover.

## Implemented in this phase

- Added the canonical `.env.example` production contract.
- Kept browser configuration limited to the Supabase URL + publishable/anon key and public site URL.
- Added an explicit Vercel redirect from `www.toplineflooringandwaterproofing.co.ke` to the canonical non-www domain.
- Preserved SPA fallback and security headers.
- Added a canonical sitemap declaration to `robots.txt`.
- Added `/.well-known/security.txt` with the real Topline contact address.
- Added `scripts/verify-phase-5-hosting.mjs` and npm script `verify:phase-5-hosting`.

## Vercel activation runbook

1. Import the GitHub repository into the Topline Vercel project.
2. Use Node 22.x and the repository's existing `npm run build` command.
3. Configure Production and Preview environment variables separately.
4. Production values:
   - `VITE_SUPABASE_URL=https://zmbsskvnzjdaxuxlauyx.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<real public key>`
   - `VITE_SITE_URL=https://toplineflooringandwaterproofing.co.ke`
5. Do not add service-role, Brevo, Africa's Talking, or other server secrets to Vercel browser environment variables.
6. Add the apex and `www` domain to Vercel.
7. Keep the old WordPress/cPanel website available until the new deployment passes UAT.

## DNS cutover principle

Do not change mail records while cutting over the website. The web migration should only alter the records required for the web host. Existing MX/mail-related records must remain intact until a separate mail migration is intentionally approved.

Recommended long-term control plane: Cloudflare DNS. It should manage authoritative DNS independently of the website host, while Vercel serves the web application and cPanel continues human mail during the transition.

## Supabase Auth production URLs

After the Vercel domain is live, configure the Supabase Auth URL allow-list for the canonical production origin and required preview/development origins. The production Site URL must be the canonical Topline domain.

Do not treat a successful Vercel build as proof that Auth redirects, RLS, storage, Edge Functions, or the database are production-ready.

## Safe cutover sequence

```text
1. GitHub main
2. CI / static verification
3. Vercel preview
4. Preview functional UAT
5. Configure production environment variables
6. Attach Vercel production domain
7. Verify HTTPS + canonical www redirect
8. Configure Supabase Auth production URLs
9. Run production smoke/UAT
10. Only then switch public DNS web records
11. Keep old WordPress available as rollback until sign-off
```

## Rollback

If production UAT fails, restore the previous web DNS target. Do not roll back by changing MX records. Existing cPanel email must remain unaffected.

## External work still required

This repository cannot itself prove or perform the following without access to the corresponding control planes/accounts:

- Vercel project/domain configuration;
- DNS record changes;
- Supabase linked migration deployment;
- Supabase Auth production URL configuration;
- Brevo domain authentication and SMTP/API activation;
- Africa's Talking sender ID, wallet, Edge Function deployment and delivery callback activation;
- real-device/browser UAT.

These remain explicit launch gates rather than being represented as completed by source-code verification.
