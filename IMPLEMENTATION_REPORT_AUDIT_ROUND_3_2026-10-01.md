# Implementation Report — Audit Round 3 (2026-10-01)

## Fixed
1. **Public `/service/:slug` page spun forever.** The app routes by location, so `useParams()` was always empty, the slug was undefined and the loader never finished. Slug now comes from the location (URL-decoded), the query uses `maybeSingle()`, and loading always ends.
2. **Placeholder company name** ("Your Flooring Company") replaced by "Topline Flooring & Waterproofing" in code fallbacks (FAQ, About, Quotation, Service detail, WhatsApp button, hero, admin login/quotations). Form placeholders were left alone.
3. **Delivery worker (`deliver-communications`)**
   - 20 s timeout on every provider call (Brevo, Africa's Talking, Meta); the scheduler call to the worker has a 120 s timeout. Previously a stalled provider could hold a job lock for 5 minutes.
   - **Duplicate-send guard:** the claim function re-queues messages locked for >10 min. If a worker died after Brevo accepted a message, it would be sent again. The worker now checks `communication_delivery_attempts` for an earlier `accepted` attempt and completes the message instead of re-sending. If that check itself fails, the message is re-queued rather than risk a duplicate.
   - **Permanent failures** (HTTP 400/404/410/422, invalid WhatsApp number) are no longer retried; 401/403/408/429/5xx/network/timeouts still retry.
4. **Provider webhook:** invalid JSON now returns 400 instead of an unhandled 500.
5. New verifier `verify-delivery-worker-hardening.mjs` (in `verify:all`).

## Findings NOT changed (need your decision or real-environment testing)
- **Brevo idempotency is unconfirmed.** The worker sends an `Idempotency-Key` inside Brevo's custom `headers` field. I could not confirm that Brevo's transactional API honours this as request idempotency; treat the accepted-attempt guard above as the real protection. Three existing verifiers require the header string, so I kept it.
- **Brevo webhook authentication.** The webhook requires header `x-topline-webhook-secret`. Check in the Brevo dashboard that webhooks can send a custom header; if not, the webhook will always get 401 and delivery status will never reconcile.
- **Soft bounces** are mapped to `failed` delivery status; they are temporary in Brevo's model. Consider mapping to a separate state.
- **Missing provider config** (no Brevo key) still consumes one attempt per message per run (the claim RPC is not channel-aware).
- Not read this round: product / hero-slide / category admin pages' own save logic, services reorder, sitemap runtime output against live data.

## Checks (local only)
verify:all 92/92 · typecheck pass · lint pass · build:all pass. Edge functions were NOT type-checked or run (Deno unavailable here).

## External gates still PENDING
Migrations #90 and #91 applied to Supabase; redeploy of the three edge functions; real Brevo send + webhook round trip; Brevo domain authentication; Vercel/DNS/HTTPS; payment provider UAT.

## Commit/push (cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git remote -v
npm run verify:all
git add -A
git commit -m "Fix public service detail loading; harden communications worker; replace placeholder company names"
git push origin main
```
