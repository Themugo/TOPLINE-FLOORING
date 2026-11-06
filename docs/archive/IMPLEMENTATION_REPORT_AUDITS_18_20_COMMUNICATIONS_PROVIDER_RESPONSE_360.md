# Phases 18–20 — Communications Provider + Response 360

## Delivered

- Durable outbound email/SMS/WhatsApp queue boundary retained and extended.
- Brevo transactional email remains the application email provider.
- Africa's Talking remains the SMS provider, with delivery and inbound callbacks.
- Meta WhatsApp Cloud API added for outbound WhatsApp and inbound/status webhooks.
- Provider message IDs and delivery events are persisted.
- Inbound email, SMS and WhatsApp responses are persisted and matched to customers where possible.
- Customer communication timeline and staff notifications receive inbound responses.
- WhatsApp is now part of automatic customer-notification routing and preferences.
- Communication Center shows outbound provider state and inbound responses.
- External provider credentials remain server-side only.
- Edge webhook JWT verification is disabled only for provider endpoints that authenticate through dedicated secret verification.

## Verification

Static verification passed:

- Communications Provider + Response 360
- Phase 3 production email
- Phase 4 SMS/customer notification operations
- Migration integrity
- Release candidate
- Phase 14 CI/release gate
- Ecommerce stability
- Launch gap
- Phases 15–17
- Phases 8, 10, 11, 12, 13

Active migrations: 38, all unique and strictly ordered.

## Live production validation still required

The Supabase connector cannot apply migrations to the dedicated project because its current connection does not have migration-write permission. The package therefore contains the complete migration and deployment wiring for application through the user's Supabase CLI/project owner context.

Live provider UAT also requires real credentials and provider-side configuration.
