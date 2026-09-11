# Phases 45–47 — Field Workforce, Project Costs & After-Sales

## Phase 45 — Installation workforce
Introduces `installation_assignments` and protected RPCs for assigning active staff and controlling installation status. The existing `installations` record remains the scheduling anchor; assignments provide normalized responsibility and availability data without breaking the existing JSON team field.

## Phase 46 — Project cost ledger
Introduces `project_cost_entries` and transactional RPCs for adding, editing, deleting and recalculating project costs. `projects.estimated_cost` and `projects.actual_cost` are derived from the ledger. Gross margin is calculated from project value minus actual cost.

## Phase 47 — Warranty and after-sales
Introduces `service_cases` for warranty, service and maintenance requests. Staff can move cases through review, scheduling, execution and resolution. Authenticated customers can create a case only for their own portal-bound customer identity.

## Safety
No production database push is performed by this initiative. Local PostgreSQL/Supabase execution remains the required validation step before remote deployment.
