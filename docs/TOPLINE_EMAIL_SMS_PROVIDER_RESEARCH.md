# Topline Email & SMS Provider Decision — Launch Economics

## Decision for the immediate paid launch

### Human business mail: keep existing cPanel mail until the replacement is proven

Do not create a new paid hosting dependency merely to get mailboxes working. The existing cPanel/mail infrastructure can remain live while the new application is deployed.

When it is time to migrate human mail, **Zoho Mail Free** is the first low-cost candidate if the free plan is available for the account's selected data centre/region. Current Zoho documentation lists up to 5 users, one domain and 5 GB per user on the free plan, with web-only access. IMAP/POP and several routing features are paid-plan features.

**Hosting.com/Titan** is attractive when a paid mailbox is desired: its current offering includes branded mail, rich webmail, calendar, contacts, mobile apps, anti-spam/anti-virus, IMAP/POP/SMTP and migration support. It is a good paid mailbox option, but it does not satisfy the current objective of minimizing launch spend.

### Application email: Brevo Free

Brevo currently documents a free transactional tier of 300 emails/day, with API and SMTP access. This is the preferred Topline launch adapter because the application already has a durable communication outbox and can use one server-side provider boundary.

### SMS: Africa's Talking for Kenya

Africa's Talking supports SMS in Kenya and provides API access plus sender ID and shortcode products. Production SMS is not realistically free; the launch should use pay-as-you-go transactional SMS and avoid a dedicated shortcode until business volume requires it.

The current application adapter therefore uses Africa's Talking server-side and keeps the sender ID configurable.

## Why not Google Workspace yet?

Google Workspace is an excellent long-term company identity/productivity platform, but it introduces a per-user monthly cost. It is unnecessary for the immediate Topline launch while cPanel mail or a free Zoho mailbox can satisfy the human-mail requirement.

It can be introduced later when the company needs Google Drive/Docs/Meet, centralized employee identity, multiple domains under one organization, or stronger collaboration controls.

## Why not Cloudflare Email Routing as the mailbox?

Cloudflare Email Routing is useful for free inbound forwarding, but it is not a complete mailbox system. It should be treated as a routing layer for aliases/forwarding, not as the replacement for staff mailboxes.

## Future SaaS model

The architecture deliberately separates:

- **Domain/DNS** — centralized independently.
- **Human mail** — mailbox provider.
- **Transactional mail** — API/SMTP provider.
- **SMS** — SMS API provider.
- **Application** — Vercel + Supabase.

That allows the same communication worker to serve Topline and future SaaS products without putting provider credentials into each frontend.

## Provider comparison snapshot

| Provider | Human mailbox | Transactional API | Free option | Multi-domain suitability | Topline launch decision |
|---|---|---|---|---|---|
| Existing cPanel | Yes | SMTP possible | Existing cost | Depends on host | **Keep temporarily** |
| Hosting.com/Titan | Yes | SMTP | No | Good for hosted mail | Paid alternative |
| Zoho Mail Free | Yes | Not the primary app API | Up to 5 users / 1 domain if region supports it | Limited on free plan | **Best low-cost mailbox candidate** |
| Google Workspace | Yes | SMTP/API options | Trial, then paid | Strong | Defer until justified |
| Cloudflare Email Routing | Forwarding | Email Sending is separate | Inbound forwarding free | Strong domain layer | Use for aliases/routing where useful |
| Brevo | No mailbox replacement | Yes | 300/day | Good | **Use for Topline transactional email** |
| Resend | No mailbox replacement | Yes | 3,000/month, 3 domains | Good | Strong developer alternative |
| MailerSend | No mailbox replacement | Yes | 500/month | Free is limited to one domain | Alternative |
| Africa's Talking | No mailbox replacement | SMS | Sandbox/testing | Strong in Kenya/Africa | **Use for Topline SMS** |

## Cost-control rule

No monthly subscription should be introduced merely because a service is architecturally interesting.

For Topline launch:

1. Reuse existing cPanel human mail while it remains available.
2. If a new mailbox is required before launch, try Zoho Mail Free first.
3. Use Brevo Free for transactional email.
4. Use Africa's Talking pay-as-you-go for only critical SMS.
5. Keep domains/DNS independent of hosting.
6. Add paid Workspace/Titan/other services only when the business has a concrete operational need.
