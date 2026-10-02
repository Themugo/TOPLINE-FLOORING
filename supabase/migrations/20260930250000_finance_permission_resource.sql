-- Permission contract fix: seven finance RPCs (record_order_payment_transaction,
-- record_invoice_payment_transaction, create_order_refund_request, complete_order_refund,
-- reconcile_order_payment_totals, reconcile_payment_provider_events, reconcile_finance_control_360)
-- and the read policies on payment_transactions / payment_refunds / finance_control_events
-- require the permission resource `finance`, but the RBAC catalogue only defines `payments`.
-- No role could ever hold it, so every staff member (including owner/admin) was refused with
-- "Permission denied: finance.update" and could not read payment records.
--
-- Fix (additive): define the `finance` resource and grant each action to exactly the roles that
-- already hold the same action on `payments`. No role gains trust it did not already have.

INSERT INTO public.staff_permissions (resource, action, description)
SELECT 'finance', a.action, 'Payments, refunds and financial reconciliation (' || a.action || ')'
FROM (VALUES ('select'), ('insert'), ('update'), ('delete')) AS a(action)
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.staff_role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, fp.id
FROM public.staff_role_permissions rp
JOIN public.staff_permissions pp ON pp.id = rp.permission_id AND pp.resource = 'payments'
JOIN public.staff_permissions fp ON fp.resource = 'finance' AND fp.action = pp.action
ON CONFLICT DO NOTHING;
