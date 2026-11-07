import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20261107160000_phase11_inventory_procurement_access_and_snapshot_hardening.sql';
const migration = fs.readFileSync(path.join(root, migrationPath), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/admin/inventory-procurement-operations.tsx'), 'utf8');
const suppliers = fs.readFileSync(path.join(root, 'src/pages/admin/suppliers.tsx'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/lib/types.ts'), 'utf8');
const permissions = fs.readFileSync(path.join(root, 'src/lib/admin-permissions.ts'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'supabase/MIGRATION_MANIFEST.md'), 'utf8');
const checks = [
  ['Phase 11 hardening migration exists', fs.existsSync(path.join(root, migrationPath))],
  ['Operations snapshot requires the route inventory/select permission', migration.includes("private.require_staff_permission('inventory','select')") && permissions.includes("'/admin/inventory-procurement-operations': { resource: 'inventory', action: 'select' }")],
  ['Reconciliation requires inventory/select rather than nonexistent inventory/read', migration.includes("v_user := private.require_staff_permission('inventory','select')")],
  ['Procurement event RLS uses the registered procurement/select action', migration.includes("private.current_user_has_permission('procurement','select')")],
  ['Orphan reconciliation includes inactive warehouse rows', migration.includes('WHERE p.id IS NULL OR p.is_active=false')],
  ['Snapshot retains stock, supplier, warehouse and PO metrics', ['active_products','low_stock','active_warehouses','active_suppliers','open_purchase_orders','pending_receipts','stock_units','movement_count'].every(k => migration.includes(`'${k}'`))],
  ['Snapshot period remains bounded', migration.includes('least(coalesce(p_days,30),365)')],
  ['All seven privileged procurement RPCs revoke PUBLIC/anon execution', (migration.match(/REVOKE ALL ON FUNCTION public\./g) || []).length === 7 && migration.includes('FROM PUBLIC,anon')],
  ['Authenticated execution grants remain explicit', (migration.match(/GRANT EXECUTE ON FUNCTION public\./g) || []).length === 7],
  ['Snapshot failures render an explicit unavailable state', page.includes('Inventory & procurement data is unavailable') && page.includes('role="alert"')],
  ['Snapshot failure does not display false zero metrics', page.includes("loading || loadError ? '—' : count(value)")],
  ['Reconciliation refreshes the snapshot after completion', page.includes('await load();')],
  ['PO UI includes the database pending/ordered statuses', types.includes("'draft' | 'pending' | 'sent' | 'ordered' | 'partial' | 'received' | 'cancelled'")],
  ['PO UI limits selection to valid next lifecycle transitions', suppliers.includes("po.status === 'ordered' ? ['partial', 'received', 'cancelled']") && suppliers.includes("po.status === 'pending' ? ['sent', 'ordered', 'cancelled']")],
  ['Terminal PO statuses cannot be edited in the selector', suppliers.includes("disabled={['received', 'cancelled'].includes(po.status)}")],
  ['Migration manifest records the Phase 11 hardening migration', manifest.includes('20261107160000_phase11_inventory_procurement_access_and_snapshot_hardening.sql')],
  ['No duplicate migration timestamp', (() => { const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')); const versions=files.map(f=>f.split('_')[0]); return new Set(versions).size===versions.length; })()],
];
for (const [label, passed] of checks) {
  assert.equal(passed, true, label);
  console.log(`PASS ${label}`);
}
console.log(`Phase 11 Inventory & Procurement hardening: ${checks.length}/${checks.length} passed.`);
