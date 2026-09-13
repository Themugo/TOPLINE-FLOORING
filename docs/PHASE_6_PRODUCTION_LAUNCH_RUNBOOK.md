# Topline Production Launch Runbook

## Pre-flight

- [ ] GitHub `main` contains the release.
- [ ] CI passes.
- [ ] `npm ci` succeeds.
- [ ] `npm run build:all` succeeds.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm run lint` succeeds.
- [ ] `npm run verify:phase-6-launch` succeeds.

## Supabase

- [ ] Project ref is `zmbsskvnzjdaxuxlauyx`.
- [ ] `supabase link --project-ref zmbsskvnzjdaxuxlauyx` points to Topline.
- [ ] `supabase db push --dry-run --linked` reviewed.
- [ ] Canonical migrations applied by an authorized operator.
- [ ] Auth Site URL and redirect URLs configured.
- [ ] Storage policies verified.

## Email

- [ ] Brevo account configured.
- [ ] Sending domain authenticated with SPF/DKIM/DMARC.
- [ ] Supabase Auth custom SMTP configured.
- [ ] `deliver-communications` deployed with server-side secrets.
- [ ] Queue worker/scheduler configured.
- [ ] Real inbox delivery test passed.

## SMS

- [ ] Africa's Talking production account configured.
- [ ] Sender ID approved/configured.
- [ ] Wallet funded.
- [ ] Edge Function secrets configured.
- [ ] Delivery-report callback registered and protected.
- [ ] Real Kenyan handset test passed.

## Vercel / DNS

- [ ] Production environment variables configured.
- [ ] Deployment succeeds.
- [ ] `toplineflooringandwaterproofing.co.ke` attached.
- [ ] HTTPS certificate active.
- [ ] `www` canonical behaviour verified.
- [ ] Existing site retained until UAT acceptance.

## Business UAT

- [ ] Public home/services/catalogue/projects/contact/quote pages.
- [ ] Lead/contact/quotation submission.
- [ ] Customer account and portal.
- [ ] Staff login/RBAC.
- [ ] Quotation → order.
- [ ] Order → project.
- [ ] Site visit/measurement.
- [ ] Inventory/material allocation.
- [ ] Installation/delivery.
- [ ] Completion/signoff.
- [ ] Invoice/payment.
- [ ] Customer notifications.
- [ ] Public order tracking privacy.
- [ ] Reports/finance/communications.

## Cutover

Only after all required gates are green:

1. Capture the final release commit SHA.
2. Confirm rollback target is still available.
3. Point production DNS to the verified Vercel deployment.
4. Verify HTTPS and canonical redirect.
5. Submit a real quotation/contact test.
6. Verify database event, email and SMS where applicable.
7. Monitor the admin System Health and Communications views.
8. Keep the previous site available until business acceptance is recorded.
