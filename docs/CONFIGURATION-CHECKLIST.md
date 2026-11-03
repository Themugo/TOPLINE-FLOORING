# Topline configuration checklist

Every environment variable the Edge Functions read, generated from the code so nothing is missed. Secrets live **only** in
Supabase (Edge Functions > Secrets) or Vercel; never in `VITE_*` variables, SQL rows or source control.

## Browser (Vercel environment variables)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (defaults to the Topline project) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public publishable key (required; the build fails without it) |
| `VITE_SITE_URL` | Public site address |

## Edge Function secrets
| Variable | Purpose | Used by | Needed | Where to set |
|---|---|---|---|---|
| `AT_API_KEY` | Africa's Talking API key | deliver-communications | Optional (SMS later) | Edge secret |
| `AT_DLR_SECRET` | SMS delivery-report secret | sms-delivery-report | Optional (SMS later) | Edge secret |
| `AT_INBOUND_SECRET` | Inbound SMS secret | sms-inbound | Optional (SMS later) | Edge secret |
| `AT_SENDER_ID` | SMS sender ID | deliver-communications | Optional (SMS later) | Edge secret |
| `AT_USERNAME` | Africa's Talking username (SMS) | deliver-communications | Optional (SMS later) | Edge secret |
| `BREVO_API_KEY` | Brevo API key for transactional email and marketing list sync | brevo-test-email, deliver-communications | Required for email | Edge secret |
| `BREVO_MARKETING_LIST_ID` | Numeric Brevo list for consented marketing contacts | deliver-communications | Optional | Edge secret |
| `BREVO_REPLY_TO_EMAIL` | Default reply-to address | brevo-test-email, deliver-communications | Recommended | Edge secret |
| `BREVO_SENDER_EMAIL` | Verified Brevo sender address | brevo-test-email, deliver-communications | Required for email | Edge secret |
| `BREVO_SENDER_NAME` | Sender display name | brevo-test-email, deliver-communications | Required (readiness check) | Edge secret |
| `CARD_GATEWAY_INITIATE_URL` | Card gateway initiation URL | payment-initiate | Optional (cards) | Edge secret |
| `CARD_GATEWAY_SECRET` | Card gateway secret | payment-initiate | Optional (cards) | Edge secret |
| `COMMUNICATION_WEBHOOK_SECRET` | Secret the Brevo delivery webhook must present | communication-provider-webhook | Required for email | Edge secret + Brevo webhook URL/auth |
| `EMAIL_INBOUND_SECRET` | Secret for Brevo inbound email parsing | email-inbound | Optional | Edge secret |
| `MPESA_BASE_URL` | Daraja base URL (sandbox or production) | payment-initiate | Required for M-Pesa | Edge secret |
| `MPESA_CALLBACK_SECRET` | Secret appended to the M-Pesa callback | payment-initiate | Required for M-Pesa | Edge secret |
| `MPESA_CALLBACK_URL` | Public URL of `payment-callback` | payment-initiate | Required for M-Pesa | Edge secret |
| `MPESA_CONSUMER_KEY` | Daraja consumer key | payment-initiate | Required for M-Pesa | Edge secret |
| `MPESA_CONSUMER_SECRET` | Daraja consumer secret | payment-initiate | Required for M-Pesa | Edge secret |
| `MPESA_PASSKEY` | Lipa na M-Pesa online passkey | payment-initiate | Required for M-Pesa | Edge secret |
| `MPESA_SHORTCODE` | Paybill / till shortcode | payment-initiate | Required for M-Pesa | Edge secret |
| `PAYMENT_CALLBACK_URL` | Generic provider callback URL | payment-initiate | Optional | Edge secret |
| `PAYMENT_CARD_CALLBACK_URL` | Card provider callback URL | payment-initiate | Optional (cards) | Edge secret |
| `PAYMENT_WEBHOOK_SECRET` | Secret for `payment-webhook` | payment-webhook | Required for payments | Edge secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database key | brevo-test-email, communication-provider-webhook, deliver-communications, email-inbound, payment-initiate, payment-status, payment-webhook, sms-delivery-report, sms-inbound, whatsapp-webhook | Required | Automatically provided to every Edge Function |
| `SUPABASE_URL` | Supabase project URL | brevo-test-email, communication-provider-webhook, deliver-communications, email-inbound, payment-initiate, payment-status, payment-webhook, sms-delivery-report, sms-inbound, whatsapp-webhook | Required | Automatically provided to every Edge Function |
| `TOPLINE_SITE_URL` | Public site address used in email links | deliver-communications | Optional | Edge secret (defaults to the .co.ke address) |
| `TOPLINE_WEB_ORIGIN` | Extra allowed browser origins (previews, staging), comma separated | _shared | Optional | Edge secret |
| `TOPLINE_WORKER_SECRET` | Shared secret for the scheduler and delivery worker (sent as header `x-topline-worker-secret`) | communication-provider-readiness, deliver-communications | Required | Supabase > Edge Functions > Secrets |
| `WHATSAPP_ACCESS_TOKEN` | Meta access token | deliver-communications | Optional (WhatsApp later) | Edge secret |
| `WHATSAPP_APP_SECRET` | Webhook signature secret | whatsapp-webhook | Optional (WhatsApp later) | Edge secret |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number id | deliver-communications, whatsapp-webhook | Optional (WhatsApp later) | Edge secret |
| `WHATSAPP_PROVIDER` | WhatsApp provider (default `meta`) | deliver-communications | Optional (WhatsApp later) | Edge secret |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Template language (default `en`) | deliver-communications | Optional (WhatsApp later) | Edge secret |
| `WHATSAPP_TEMPLATE_NAME` | Approved template name (outside 24h window) | deliver-communications | Optional (WhatsApp later) | Edge secret |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token | whatsapp-webhook | Optional (WhatsApp later) | Edge secret |

## Dashboard settings (not secrets)
1. **Supabase Auth > URL Configuration**: Site URL `https://toplineflooringandwaterproofing.co.ke`; Redirect URLs include `/portal` and `/admin/settings` for both the bare and `www.` domains.
2. **Supabase Auth > SMTP**: Brevo relay (`smtp-relay.brevo.com`, port 587) with the Brevo **SMTP** login and key (not the API key).
3. **Supabase Auth > Email Templates**: paste the four files from `docs/email-templates`.
4. **Admin > Site Control > Integrations > communications.email**: enable the provider and set **New enquiry alert email(s)**. If left empty, alerts go to the contact email in Admin > Site Settings. Without either, staff receive no new-enquiry email (customers still get their acknowledgement).
5. **Brevo > Transactional > Webhook**: `https://<project>.supabase.co/functions/v1/communication-provider-webhook?secret=<COMMUNICATION_WEBHOOK_SECRET>` for delivered, hard bounce, soft bounce, blocked, spam, invalid and unsubscribed events.
6. **Scheduler**: call `deliver-communications` every minute and `operations-scheduler` on its schedule with header `x-topline-worker-secret`.

## Verifying
* `communication-provider-readiness` (POST with the worker secret) lists missing keys per provider; email must report `ready: true`.
* Admin > Site Control > send a Brevo test email to a mailbox you own.
* Submit a test quotation: you should receive the acknowledgement, and the alert address should receive the staff alert.
