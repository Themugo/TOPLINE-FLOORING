# TOPLINE Admin Page UX + Workflow Hardening — 2026-10-02

## Source of truth
This package continues from `TOPLINE-FLOORING-ADMIN-DASHBOARD-PROFESSIONAL-2026-10-02.zip` and is the new admin-page source package for the next development stage.

## Product principle
Topline's business client should be able to sell products and services, manage customers, follow orders, prepare quotations, invoice customers, manage projects and coordinate delivery without needing to understand the underlying technical system.

The developer/system administrator remains the owner of technical controls. Those controls remain available under **System Administration**, but are not placed in the client's everyday workflow.

## Page-level changes
- Products: plain-language subtitle, clearer search, photo/edit/archive actions, simpler action labels.
- Services: plain-language subtitle and customer-facing wording; removed technical/unsupported warranty example from the feature placeholder.
- Orders: plain-language subtitle and order-focused detail terminology; technical "360" wording removed from the user interface.
- Customers: simple customer lookup wording and clearer purpose.
- Projects: simplified project wording and removed the competing manual Actual Expenses field from project editing.
- Quotations: clearer quote-to-order workflow language; CRM terminology reduced in the client-facing UI.
- Invoices: clearer invoice/payment workflow language.
- Inventory: focused on stock levels, alerts and safe stock changes.
- Site Visits: focused on scheduling field appointments.
- Deliveries: focused on dispatch-to-completion tracking.
- Sales & Enquiries: presented as the client-facing sales workflow.

## Project cost authority
The Projects budget workspace no longer fabricates default expense lines and no longer stores operational cost changes in local component state. Actual costs are read from and written to the existing `project_cost_entries` ledger through the existing RPC boundary.

`projects.actual_expenses` remains in the schema/type surface for compatibility but is no longer exposed as a competing manual control in the project editor.

## Verification
- `npm run verify:all`: **98/98 passed, 0 failed**
- Changed TS/TSX/MJS files: **syntax/transpile pass** using the installed TypeScript compiler API.
- Dependency-backed `typecheck`, `lint` and `build:all`: not certified in the isolated package because `node_modules` is not included. Run them in the Windows working checkout after dependencies are available.
- Live Supabase migration deployment remains an external environment gate and is not falsely claimed as complete.

## Scope protection
No new business capability was introduced. The work is limited to presentation, terminology, workflow clarity, and correction of the existing project-cost persistence path.
