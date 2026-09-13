# Phase 6 — Production Launch Readiness & UAT Control

## Objective

Turn the production hosting foundation into a controlled launch process. This phase does not pretend that external services are live; it makes the final activation sequence explicit, repeatable and fail-closed.

## Launch gates

1. **Source gate** — `main` contains the complete release and CI is green.
2. **Build gate** — run `npm ci`, `npm run build:all`, `npm run typecheck`, and `npm run lint` in an environment with dependencies installed.
3. **Database gate** — from an authorized Supabase CLI session, run the linked dry-run first, then apply the canonical migrations only after reviewing the plan.
4. **Auth gate** — configure the Topline production site URL and allowed redirect URLs in the dedicated Supabase project.
5. **Email gate** — configure Brevo transactional sending, SPF/DKIM/DMARC and Supabase Auth custom SMTP; perform a real inbox test.
6. **SMS gate** — configure Africa's Talking production credentials, sender ID, positive wallet balance and delivery-report callback; perform a real Kenyan handset test.
7. **Vercel gate** — configure production environment variables, deploy, verify HTTPS and canonical domain, then verify `www` behaviour.
8. **UAT gate** — test the complete business journey: lead → customer → quotation → order → project → site visit/measurement → materials → installation → completion/signoff → invoice → payment → after-sales.
9. **Rollback gate** — keep the existing WordPress/cPanel site available until the new production release has passed UAT and business acceptance.

## Safe local command

```cmd
npm run launch:check
```

This command checks local production configuration without printing secrets. `MANUAL` items are intentionally reported as external activation tasks rather than falsely marked ready.

## Required production environment

Public frontend configuration belongs in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SITE_URL`
- public contact defaults as required by `.env.example`

Server-side secrets **must not** be placed in Vite variables or committed to Git. Brevo, Africa's Talking, Supabase service-role credentials and callback secrets belong only in the appropriate server/Edge Function secret stores.

## Database activation

The repository contains the canonical migration history, but source files alone do not prove the remote database is deployed. Use the authorized Supabase CLI/control plane to perform:

```cmd
supabase link --project-ref zmbsskvnzjdaxuxlauyx
supabase db push --dry-run --linked
```

Review the plan before applying it. Do not run a production push from an untrusted or ambiguous Supabase project.

## Provider activation order

1. Domain/DNS and HTTPS
2. Supabase Auth URL/redirect configuration
3. Brevo domain authentication and transactional sending
4. Africa's Talking sender ID, wallet and delivery callback
5. Deploy Edge Functions and configure server secrets
6. Configure a scheduler/worker invocation for `deliver-communications`
7. Perform real inbox and handset tests
8. Run end-to-end business UAT
9. Switch public traffic only after acceptance

## Acceptance criteria

A production launch is accepted only when:

- the canonical domain serves the new application over HTTPS;
- Supabase points to the dedicated Topline project;
- authentication works with production redirects;
- quotation/contact submissions reach the database;
- staff authorization blocks unauthorized mutations;
- transactional email reaches a real inbox;
- SMS reaches a real Kenyan handset and its final delivery state is recorded;
- order/project/invoice lifecycle transitions are visible to authorized staff;
- customer-facing tracking does not expose private data;
- backups/PITR and operational export procedures are understood;
- the rollback path to the existing site remains available until business sign-off.

## What this phase deliberately does not claim

- No remote Supabase migration is claimed as deployed.
- No Vercel production deployment is claimed as live.
- No DNS cutover is claimed.
- No Brevo account/domain authentication is claimed.
- No Africa's Talking production sender ID, wallet or handset delivery is claimed.
- No scheduler is claimed to be running.

These are external activation steps and require the relevant accounts/control planes plus real-world UAT.
