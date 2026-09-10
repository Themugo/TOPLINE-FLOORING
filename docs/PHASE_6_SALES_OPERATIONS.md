# Phase 6 — Sales & CRM Command Center

The sales domain is now presented as one workflow across leads, quotations, orders and invoices.

## Principles
- Existing pages remain the detailed working screens.
- The command center is read-only orchestration; it does not duplicate business records.
- Database/RLS remains authoritative.
- Failed reads surface an explicit error instead of silently inventing figures.

## Workflow
Capture → qualify → quote → negotiate → win → order → invoice → collect.
