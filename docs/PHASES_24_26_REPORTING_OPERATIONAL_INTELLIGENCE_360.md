# Phases 24–26 — Reporting & Operational Intelligence 360

## Phase 24 — Canonical reporting read model
Replaced browser-side multi-query reporting aggregation with a single staff-authorized `get_reporting_operational_intelligence_360()` RPC. The database remains the authoritative reporting layer over canonical commerce, finance, service and communications tables.

## Phase 25 — Operational intelligence
The reporting surface now returns revenue, orders, quotations, customer acquisition, pending orders, inventory valuation, outstanding invoices, service cases and communication response/delivery indicators from one bounded period-aware read contract.

## Phase 26 — Reporting performance and security
The RPC is `STABLE`, `SECURITY DEFINER`, explicitly permission-gated through the existing reports/read capability, and executable only by authenticated users. The browser no longer issues unrestricted aggregate queries across core operational tables.

### Scope
- Period selector remains bounded to 1–365 days.
- Revenue trend, order status, quotation status and top-product summaries are returned by the same contract.
- Communications metrics use provider-event state already recorded by the communications subsystem.
- No secrets or provider credentials are exposed.
- This initiative does not invent a new reporting datastore; it reuses canonical production tables.
