# TOPLINE Track Order + Contact Deep Audit and Premium Redesign

Date: 2026-10-14

## Scope and guardrails

Reviewed the public Track Order and Contact pages, navigation routes, client service wrappers, checkout confirmation deep-link, relevant Supabase migrations/RPC contracts, and customer journey notification trigger definitions. The update is a page-layer redesign plus static contract checks. It intentionally does not replace RPCs, bypass row-level security, add direct browser table writes, or alter order/quotation schema.

## Track Order workflow map

1. Header's More navigation and the customer support utility links navigate to `/track-order`.
2. Checkout's order-confirmation page can open `/track-order?order=<encoded order number>`; the page continues to prefill the order reference from this query parameter.
3. The customer enters both order number and checkout phone.
4. `src/lib/delivery.ts::trackOrder` calls Supabase RPC `track_order_public` with `p_order_number` and `p_phone`.
5. The privacy migration `20260912000000_056_public_tracking_privacy.sql` matches case-insensitive order number and exact trimmed `customer_phone`, and returns a bounded JSON object containing order summary, line items, and latest delivery record. Browser code does not select the orders table directly.
6. The page renders order/payment status, totals, address, line items, delivery reference/status, scheduled date, dispatch/delivery dates, driver name, and delivery note only when present. It offers configured contact channels and a contact-form route.

### Track Order findings and treatment

- Preserved both-factor lookup and the canonical RPC contract; did not loosen phone matching or expose broader order fields.
- Improved loading, invalid/not-found/error handling, accessible labels, responsive layout, status labels/progress, delivery timeline details, and recovery actions.
- Phone matching remains exact after trimming because that is the database contract. If historical checkout records use inconsistent phone formats, live users may need to enter the exact checkout format; a future normalization change must be designed and tested at the database boundary rather than silently changing UI input.
- Status progress is a presentation of the latest returned status, not a full historical event timeline. The current RPC does not return a status-event history.
- No live Supabase request was run; real data correctness depends on deployed migrations, current order data, and delivery-operation writes.

## Contact workflow map

1. Header/footer and other customer paths navigate to `/contact`.
2. Contact details and social links are read from the existing site settings hook.
3. The customer completes name, email, phone, optional subject, and message.
4. `src/lib/commerce.ts::submitQuotationRequest` invokes `submit_quotation_request`.
5. The current database function validates fields and creates both a `leads` record and a `quotations` record, links the lead to the quotation, and returns IDs. The quotation status trigger can create a customer journey notification event.
6. The page shows success feedback and clears the form only after the RPC returns success; failures preserve form values and show an error toast.

### Contact findings and treatment

- Preserved the established lead + quotation RPC rather than writing directly to `contact_messages`, which would bypass the current workflow.
- Added accessible labels, client-side bounds aligned with the RPC's name/email/phone/message constraints, duplicate-submit protection, a pending state, a message counter, and clear success/failure feedback.
- Removed unsupported time-bound/free-assessment/24-7 promises from the visible contact copy.
- Contact details/social channels are only shown when their source values exist. The old generic map link was replaced with directions based on the configured address. Removed the displayed business-hours card because the current `useSiteSettings` implementation supplies hardcoded hours instead of reading them from a persisted site setting; showing those as configured hours would be misleading.
- The existing contact form uses the quotation-request RPC and therefore creates a lead and quotation record, not a `contact_messages` row. This is intentional preservation of current behavior. If the business wants a separate contact-message workflow, that needs an explicit backend/admin/notification design, not a frontend-only table insert.

## Communications and admin considerations

- The inspected quotation RPC and customer-journey trigger establish a record and notification-event path, but static source review alone does not prove a customer email/SMS was delivered. Delivery depends on the deployed communications worker/provider configuration and its runtime logs.
- Existing staff operations remain the source of delivery updates. The public page displays the latest delivery record returned by the RPC; it does not fabricate a location or ETA.

## Verification

Static checks:

- `scripts/verify-public-order-tracking-privacy.mjs`
- `scripts/verify-public-tracking-contract.mjs`
- `scripts/verify-customer-self-service-rpc-trust-boundary-360.mjs`
- `scripts/verify-track-contact-workflows.mjs`

A full dependency install did not complete in this environment, so TypeScript, ESLint and Vite production build are not claimed as passed. Live Supabase, email/SMS provider, order status transitions, delivery staff updates, and contact-to-admin visibility require staging UAT with valid configuration.

## Staging UAT checklist

1. Open Track Order from desktop More, mobile menu, customer utility link, and checkout confirmation.
2. Verify query-string order reference prefill, missing fields, wrong order number, wrong phone, exact-format phone matching, valid order, no delivery record, scheduled delivery, dispatched, in-transit, delivered, cancelled/failed states.
3. Change delivery status using the existing authorized staff workflow and confirm public tracking reflects the latest record after a fresh lookup.
4. Verify public RPC returns only intended fields and does not expose private delivery driver phone, internal notes, or unrelated customer/order records.
5. Submit Contact with valid/invalid/overlong values, double-click submit, simulate RPC failure, and confirm successful submissions appear in both Leads and Quotations as expected.
6. Confirm staff notification event and downstream email/SMS delivery status in authorized staging; do not treat toast success as proof of provider delivery.
7. Check desktop, tablet, mobile, keyboard-only operation, screen-reader labels, slow network, missing settings, and failed Supabase response.
