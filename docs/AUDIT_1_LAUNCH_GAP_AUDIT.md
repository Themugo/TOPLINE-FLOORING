# Phase 1 — Topline Launch Gap Audit + End-to-End Repair

## Objective

Move the current repository from a release-candidate codebase toward a production launch baseline without creating small patch phases. This phase repairs launch-critical gaps as complete vertical capabilities and establishes the cheapest practical communication architecture for the immediate Topline launch.

## Current baseline

The current repository already contains the major business domains: public website, catalogue, checkout, quotation flow, customer portal, CRM, projects, delivery, inventory, procurement, finance, communications, after-sales, authorization, payment/refund boundaries and release verification.

The remaining launch risk was not a lack of individual pages. It was the gap between **code that exists** and **a real production system of record with real content and real outbound communications**.

## Repairs completed in this phase

### 1. Production content no longer depends on fake demo business identity

The CMS baseline no longer imports mock hero/service/project/testimonial/partner records. Placeholder business identity such as `example.com`, `Your Flooring Company`, US currency and US timezone were removed from the production baseline.

The fallback identity is now aligned to the existing Topline public site and Kenya operating context. Dynamic catalogue, project, testimonial and partner records remain empty until they are loaded from the approved Supabase CMS/database rather than silently presenting fabricated records.

### 2. CMS fails closed instead of silently masking a database failure

The CMS service now requires the dedicated Topline Supabase configuration and throws a clear database/content error instead of silently replacing a production database failure with demo content.

### 3. Product loading no longer treats database failure as a valid empty catalogue

The product hook now distinguishes a successful empty catalogue from a failed query. Database failures surface as errors instead of silently becoming an apparently legitimate empty store.

### 4. Durable email/SMS delivery boundary

The existing `communication_outbox` is now paired with service-role-only worker RPCs:

- `claim_communication_outbox_worker`
- `complete_communication_delivery_worker`
- `fail_communication_delivery_worker`

The new `deliver-communications` Edge Function consumes queued messages server-side. Browser code never receives provider credentials.

Initial provider adapters are deliberately cheap/provider-neutral:

- **Transactional email:** Brevo API
- **Kenyan SMS:** Africa's Talking API
- **WhatsApp:** remains queued but intentionally fails until a concrete WhatsApp provider is selected

Required Edge Function secrets:

- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`
- `AT_USERNAME`
- `AT_API_KEY`
- `AT_SENDER_ID` (when branded sender ID is activated)
- `TOPLINE_WORKER_SECRET`

No provider credential belongs in GitHub, `VITE_*` variables or the browser.

## Cheapest practical launch architecture

### Human/business mail

For the immediate Topline launch, do not make cPanel a new application dependency. Keep the existing legacy mail working until the new mailbox provider is verified.

The preferred low-cost replacement candidate is **Zoho Mail Free**, if the account is offered in the applicable data centre/region. Zoho currently documents up to 5 users, one domain and 5 GB per user on the free plan, but web-only access and regional availability limitations apply. If desktop/mobile IMAP/POP access is mandatory, use a paid mailbox plan or retain the existing cPanel/Titan mailbox during the transition.

### Application/transactional email

Use Brevo's free transactional tier initially: 300 emails/day with API/SMTP access. This is more than sufficient for an early Topline launch and avoids paying for a separate mail server just to deliver account and business-event notifications.

### SMS

Use Africa's Talking for Kenya because it has native Kenyan SMS services, sender-ID support and a developer API. SMS is not realistically free in production; the launch should therefore use SMS only for business-critical notifications and start with prepaid/pay-as-you-go volume rather than a monthly hosting commitment.

### Domains/DNS

Keep domain/DNS management independent from application hosting. Cloudflare Email Routing can provide free forwarding for addresses that only need inbound routing, but it is not a full mailbox replacement. The domain layer should eventually become the central control plane for Topline, future SaaS domains and managed client domains.

## Launch dependency order

1. Dedicated Supabase production project and canonical migration replay.
2. Production CMS/catalogue/content import from approved Topline data.
3. Supabase Auth and storage verification.
4. Human email verification and DNS mail records.
5. Brevo domain authentication and transactional email test.
6. Africa's Talking sandbox test, then production sender ID only if branded SMS is required immediately.
7. Payment provider activation.
8. Vercel production deployment.
9. Domain/DNS cutover.
10. Full customer/staff UAT.

## Explicit non-goals

- No new hosting subscription solely for this phase.
- No Google Workspace subscription before Topline actually needs it.
- No SMS subscription/shortcode before the customer notification use cases justify it.
- No provider secrets committed to the repository.
- No production database migration is claimed as complete by static source inspection alone.

## External validation still required

The repository must still pass `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, local Supabase replay/lint/tests, generated database types, and the linked production dry-run before production migrations are applied.
