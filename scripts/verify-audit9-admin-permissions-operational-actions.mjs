import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261106200000_audit9_admin_permissions_operational_actions.sql'), 'utf8');
const fulfillment = fs.readFileSync(path.join(root, 'supabase/migrations/20260913050000_078_fulfillment_delivery_control_360.sql'), 'utf8');
const rbac = fs.readFileSync(path.join(root, 'supabase/migrations/20260912020000_058_authorization_order_operations_360.sql'), 'utf8');
const check = (condition, message) => { if (!condition) throw new Error(message); };

check(migration.includes("private.require_staff_permission('orders','update')"), 'Operational repairs must remain staff/RBAC gated');
check(migration.includes("v_payment_status <> 'paid'"), 'Picking and recovery must require a fully paid order');
check(migration.includes("v_status IN ('delivered','cancelled')"), 'Reschedule and exception actions must protect terminal deliveries');
check(migration.includes("v_order_status IN ('cancelled','completed')"), 'Recovery must protect terminal orders');
check(migration.includes('v_driver_active'), 'Dispatch must recheck the assigned driver is active');
check(migration.includes('delivery_events') && migration.includes('fulfillment_events'), 'Operational state changes must retain event history');
check(fulfillment.includes("GRANT EXECUTE ON FUNCTION public.dispatch_order_delivery(uuid) TO authenticated"), 'Dispatch must remain behind the authenticated RPC boundary');
check(rbac.includes('CREATE OR REPLACE FUNCTION private.require_staff_permission'), 'Shared staff permission boundary must remain present');
console.log('Phase 9 admin permissions and operational actions static verification PASSED');
