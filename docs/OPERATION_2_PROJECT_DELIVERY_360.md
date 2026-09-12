# Operation 2 — Project Delivery 360

## Scope

Converges the complete project execution operation: planning, field execution, workforce, material allocation, progress, issues, cost, quality inspection and customer completion.

## Server-authoritative controls

- `update_project_delivery_status` protects terminal project states and records status events.
- `record_project_quality_inspection` validates project/installation relationships and records quality history.
- `reconcile_project_delivery_360` calculates operational readiness across tasks, issues, installation, cost, quality and sign-off.
- `get_project_delivery_360` provides the complete project execution snapshot to the admin surface.
- `complete_project_with_signoff` now requires execution completion, resolved issues/tasks, completed installation when present, and passed/waived quality before customer-approved completion.

## Security

Execution event and quality tables are read-only to authenticated clients. Mutations are performed through SECURITY DEFINER RPCs with staff permissions. Anonymous access is revoked.

## Deployment

Run the repository verification first. Then use the existing local Supabase replay and linked `db push --dry-run` process. Never reset the linked production database.
