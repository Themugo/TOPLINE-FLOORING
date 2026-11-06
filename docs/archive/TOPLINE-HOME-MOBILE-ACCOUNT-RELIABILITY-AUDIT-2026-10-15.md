# TOPLINE Home, Mobile Navigation and Customer Account Reliability Audit

Date: 2026-10-15
Foundation: Existing TOPLINE FLOORING & ROOFING source; preserve current brand identity, routes, hero dimensions, commerce, auth, payment and CMS contracts.

## Changes

- Reduce the perceived homepage hero image flash by using the active, business-configured hero image as the section backdrop while its image element decodes. The established 30rem / 32rem / 35rem responsive height contract is unchanged. Existing CMS hero slides remain authoritative.
- Add mobile header search and direct call actions alongside cart and menu. Search submits to the existing shop route with a query parameter; the Shop page initializes its existing catalogue filter from that parameter.
- Replace the bottom mobile call/WhatsApp/quote bar with four primary actions: Services, Shop, WhatsApp, and Get quote. Preserve safe-area padding and hide the bar on cart/checkout/payment-return routes.
- Make the customer portal load its canonical `get_customer_portal_360` payload independently. Journey, preferences, documents, and communication history use `Promise.allSettled`, so an ancillary endpoint outage does not hide orders and quotations.
- Add a database migration to backfill only existing email-verified Auth users with exactly one normalized customer-email match, and only where neither the Auth identity nor customer is already mapped. Ambiguous matches and existing mappings are deliberately left untouched. No customer data is merged or reassigned.

## Important limits

The UI change can prevent ancillary account services from blanking the dashboard, but it cannot guarantee the canonical portal RPC will succeed for a specific production account. If the core RPC still fails after migration deployment, inspect the exact Supabase RPC error and that account's `customer_portal_access` row using privileged, read-only diagnostics. Do not expose customer data or automatically link ambiguous identities.

## Required local release checks

Run the included Windows script from the existing repository. It executes static verifiers, typecheck, lint, smoke tests, build, diff checks, stages only the listed files, and pauses for review before commit/push. Supabase migration deployment and real authenticated-account testing remain explicit release gates.
