# Phases 65–67 — Public Order Tracking & Post-Purchase Integrity

## Objective

Complete the public post-purchase journey as one protected workflow: checkout → canonical order reference → confirmation → privacy-safe tracking.

## Phase 65 — Tracking identity hardening

Public tracking now requires both the order number and the phone number used at checkout. The RPC matches both values before returning order, item and delivery information. This prevents phone-only lookup from exposing the latest order associated with a phone number.

## Phase 66 — Canonical order confirmation

Checkout carries the database-generated order number into the session receipt. The confirmation page displays that canonical reference and provides a direct tracking action. The receipt survives page refresh for up to 24 hours in session storage, then expires locally.

## Phase 67 — End-to-end regression gate

The initiative adds static contract verification and extends the repository migration count from 22 to 23. The full lint/typecheck/Vite build remains the release gate.

## Safety

- No production Supabase migration is applied by this initiative.
- No payment provider is activated.
- No DNS or WordPress changes are made.
- Existing RLS and SECURITY DEFINER boundaries remain in place.
