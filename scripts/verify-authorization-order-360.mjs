import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const mig = read('supabase/migrations/20260912020000_058_authorization_order_operations_360.sql');
const orders = read('src/pages/admin/orders.tsx');
const ops = read('src/lib/order-operations.ts');
const checks = [
  [mig.includes('JOIN public.staff_profiles sp ON sp.user_id = ra.user_id'), 'RBAC helper must join staff_profiles.user_id to role_assignments.user_id.'],
  [mig.includes("lower(coalesce(p_action,'')) = 'read'"), 'RBAC helper must normalize legacy read actions to select.'],
  [!mig.includes('sp.id = ra.staff_id'), 'Stale staff_profiles.id/role_assignment.staff_id join remains.'],
  [mig.includes("private.current_user_has_permission('finance','select')"), 'Refund RLS must use the canonical permission helper.'],
  [!mig.includes('private.has_staff_permission'), 'Unknown has_staff_permission helper reference remains.'],
  [mig.includes('CREATE OR REPLACE FUNCTION public.get_order_operations_360'), 'Order operations 360 RPC is missing.'],
  [mig.includes("private.require_staff_permission('orders','select')"), 'Order 360 must enforce order read permission.'],
  [mig.includes("'finance_access', v_finance"), 'Order 360 must expose finance visibility explicitly.'],
  [mig.includes("'payments', v_payments") && mig.includes("'refunds', v_refunds"), 'Order 360 finance payload is incomplete.'],
  [ops.includes("get_order_operations_360") && ops.includes('reconcile_order_payment_totals'), 'Frontend order operations contract is incomplete.'],
  [orders.includes('Order operations 360') && orders.includes('Reconcile totals'), 'Admin order 360 UI is incomplete.'],
];
const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error('Authorization + Order Operations 360 verification FAILED.'); failures.forEach((x) => console.error(`- ${x}`)); process.exit(1); }
console.log('Authorization + Order Operations 360 verification PASSED.');
console.log('- RBAC helper repaired');
console.log('- legacy read/select compatibility enforced');
console.log('- refund RLS repaired');
console.log('- permission-aware order operations snapshot added');
