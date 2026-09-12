import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const required = [
  '20260910000000_topline_canonical_schema.sql',
  '20260910090000_032_commerce_contract_hardening.sql',
  '20260910100000_033_staff_rbac_audit_foundation.sql',
  '20260910110000_topline_rpc_contracts.sql',
  '20260910120000_catalogue_inventory_procurement_engine.sql',
  '20260910130000_customer_portal_security.sql',
  '20260910140000_sales_project_lifecycle.sql',
  '20260910150000_project_delivery_field_operations.sql',
  '20260910160000_finance_communications_analytics.sql',
  '20260910170000_customer_journey_notifications.sql',
  '20260911080000_039_admin_mutation_security.sql',
  '20260911090000_040_communication_outbox_delivery.sql',
  '20260911100000_041_system_health_observability.sql',
  '20260911110000_042_order_delivery_lifecycle.sql',
  '20260911120000_043_delivery_proof_and_customer_tracking.sql',
  '20260911130000_045_installation_workforce.sql',
  '20260911140000_046_project_cost_ledger.sql',
  '20260911150000_047_warranty_after_sales.sql',
  '20260911160000_048_ecommerce_stability_foundation.sql',
  '20260911170000_049_payment_inventory_lifecycle_hardening.sql',
  '20260911180000_054_refunds_and_payment_reconciliation.sql',
  '20260911190000_055_reservation_expiry_and_operations.sql',
  '20260912000000_056_public_tracking_privacy.sql',
  '20260912010000_057_commerce_fulfillment_integrity.sql',
  '20260912020000_058_authorization_order_operations_360.sql',
  '20260912040000_launch_communications_worker.sql',
  '20260912050000_production_infrastructure_rls_storage.sql',
  '20260912120000_061_field_operations_360.sql',
  '20260912100000_059_production_communications_worker.sql',
  '20260912110000_060_sms_customer_notification_operations.sql',
];

const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
const missing = required.filter((f) => !files.includes(f));
if (missing.length) {
  console.error('Missing active migrations:', missing.join(', '));
  process.exit(1);
}
const migrationVersions = files.map((f) => f.match(/^\d+/)?.[0]).filter(Boolean);
if (new Set(migrationVersions).size !== migrationVersions.length) {
  console.error('Duplicate active migration timestamps detected.');
  process.exit(1);
}

const source = fs.readFileSync(path.join(root, 'src/lib/commerce.ts'), 'utf8');
const cart = fs.readFileSync(path.join(root, 'src/pages/cart.tsx'), 'utf8');
const orders = fs.readFileSync(path.join(root, 'src/pages/admin/orders.tsx'), 'utf8');

for (const token of ['create_secure_customer_order', 'idempotencyKey']) {
  if (!source.includes(token)) throw new Error(`commerce.ts missing ${token}`);
}
if (!cart.includes('paymentMethod')) throw new Error('cart.tsx missing payment method');
if (!cart.includes('checkoutIdempotencyKey')) throw new Error('cart.tsx missing checkout idempotency');
if (!orders.includes('update_order_status_transaction')) throw new Error('admin order mutation is not using secure RPC');

const migration48 = fs.readFileSync(path.join(migrationDir, '20260911160000_048_ecommerce_stability_foundation.sql'), 'utf8');
for (const token of ['notes text', 'v_item jsonb', 'record_order_payment_transaction', 'release_expired_inventory_reservations']) {
  if (!migration48.includes(token)) throw new Error(`Phase 48 migration missing ${token}`);
}
if (!migration48.includes('payment_transactions_idempotency_idx') && !migration48.includes('payment_transactions_idempotency')) {
  throw new Error('Phase 48 migration is missing payment idempotency index');
}

console.log(`Topline ecommerce stability verification passed. Active migrations: ${files.length}`);
