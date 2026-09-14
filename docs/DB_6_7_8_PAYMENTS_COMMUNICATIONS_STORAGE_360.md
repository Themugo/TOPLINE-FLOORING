# DB-6 / DB-7 / DB-8 — Payments, Communications & Storage 360

## Scope

This sweep hardens the production Supabase control plane across:

- **DB-6 Payments:** provider-event intake and payment/refund ledgers remain behind RPC/service boundaries; authenticated clients retain read-only access where the existing application contract requires it.
- **DB-7 Communications:** provider events, inbound messages and delivery attempts are not directly writable by browser clients; outbox/history mutation is routed through existing server-side RPC/worker paths.
- **DB-8 Storage:** `images` and `private-documents` receive explicit 10 MiB upload ceilings and MIME allowlists while preserving the existing storage RLS policies.

## Live verification

- Dedicated Supabase project: `zmbsskvnzjdaxuxlauyx`
- Database engine: PostgreSQL 17
- Existing payment provider idempotency constraint: `(provider, provider_event_id)` unique.
- Existing inbound communication idempotency constraint: `(provider, channel, provider_message_id)` unique.
- Existing communication provider event uniqueness constraint retained.
- Added supporting indexes for payment reconciliation and communication provider lookup.
- No business rows were modified.

## Security-advisor interpretation

The remaining Supabase security-advisor warnings are pre-existing architectural findings around public-schema `SECURITY DEFINER` RPC exposure and four internal RLS-enabled control tables with intentionally no client policies. The four anonymous RPCs are deliberate public entry points already certified in the earlier RPC boundary work. They are not treated as launch blockers by this phase.

Performance-advisor unused-index notices are also not treated as blockers; the database has broad pre-existing indexing from the earlier lifecycle hardening work.
