# Phases 18–20 — Project Delivery & Field Operations

Topline now has a canonical operational layer between a won sale and completed work.

## Lifecycle

Lead → Quotation → Order → Project → Site Survey → Measurements → Installation → Tasks/Progress → Material Allocation → Issues/Resolution → Customer Sign-off → Completed Project

## Delivery records

- `project_tasks` — execution tasks, ownership, due dates and completion state.
- `project_measurements` — field measurements with units and audit actor.
- `project_material_allocations` — project-specific stock allocations.
- `project_issues` — operational exceptions and resolution state.
- `project_signoffs` — customer completion approval/signature reference.

## Transactional controls

All sensitive mutations use authenticated SECURITY DEFINER RPCs backed by staff permissions. Material allocation decrements warehouse stock and total product stock atomically and writes an inventory movement. Project completion and customer sign-off are recorded in one transaction.

## Admin UX

`/admin/project-delivery` provides project selection, progress control, installation scheduling, site measurements, task management, issue management, material-allocation visibility and customer completion sign-off in one delivery workspace.

## Database deployment note

This migration has been designed against the canonical Topline schema but has not been pushed to the production Supabase project. Validate with a local Supabase stack first, then reconcile against the linked production project before deployment.
