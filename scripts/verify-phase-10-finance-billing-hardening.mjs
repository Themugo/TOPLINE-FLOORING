import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20261107150000_finance_invoice_lifecycle_hardening.sql';
const migration = fs.readFileSync(path.join(root, migrationPath), 'utf8');
const permissions = fs.readFileSync(path.join(root, 'src/lib/admin-permissions.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/admin/finance-operations.tsx'), 'utf8');
const lib = fs.readFileSync(path.join(root, 'src/lib/finance-operations.ts'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'supabase/MIGRATION_MANIFEST.md'), 'utf8');
const checks = [
  ['Phase 10 migration exists', fs.existsSync(path.join(root, migrationPath))],
  ['Invoice lifecycle RPC remains canonical', migration.includes('CREATE OR REPLACE FUNCTION public.transition_invoice_lifecycle')],
  ['Lifecycle mutation remains staff-authorized', migration.includes("private.require_staff_permission('invoices','update')")],
  ['Lifecycle functions pin an empty search_path', (migration.match(/SET search_path = ''/g) || []).length >= 3],
  ['Invoice row is locked before ledger validation', migration.indexOf('FOR UPDATE') < migration.indexOf('SELECT COALESCE(sum(p.amount),0)')],
  ['Partial status requires a real partial collection', migration.includes("v_paid>0 AND v_paid<v_invoice.total_amount AND v_invoice.total_amount>0")],
  ['Paid status requires a positive invoice total', migration.includes("v_invoice.total_amount>0 AND v_paid>=v_invoice.total_amount")],
  ['Overdue status requires a past due date and outstanding balance', migration.includes("v_invoice.due_date<current_date AND v_balance>0")],
  ['Lifecycle transition checks stored ledger consistency', migration.includes('v_invoice.amount_paid IS DISTINCT FROM v_paid')],
  ['Invoice send still requires a line item', migration.includes('Invoice must have at least one line item before sending')],
  ['Invoice event history records ledger amount', migration.includes('to_status,amount,note,created_by')],
  ['Automatic refresh derives paid totals from payment rows', migration.includes('Automatic lifecycle refresh from payment ledger')],
  ['Automatic refresh repairs stale amount_paid', migration.includes('r.amount_paid IS DISTINCT FROM v_paid')],
  ['Automatic refresh restores sent/partial/overdue/paid states', migration.includes("ELSE 'sent' END") && migration.includes("THEN 'partial'") && migration.includes("THEN 'overdue'") && migration.includes("THEN 'paid'")],
  ['Finance snapshot uses current reports/select permission', migration.includes("private.require_staff_permission('reports','select')")],
  ['Finance route matches reporting snapshot permission', permissions.includes("'/admin/finance-operations': { resource: 'reports', action: 'select' }")],
  ['Finance snapshot still exposes receivables aging', migration.includes("'aging',(SELECT jsonb_build_object(")],
  ['Finance snapshot still exposes invoice and collection metrics', migration.includes("'invoiced'") && migration.includes("'collected'") && migration.includes("'outstanding'")],
  ['Finance snapshot period remains bounded to 365 days', migration.includes('least(coalesce(p_days,30),365)')],
  ['Anonymous and PUBLIC execution revoked', migration.includes('FROM PUBLIC,anon')],
  ['Authenticated RPC grants remain explicit', (migration.match(/TO authenticated/g) || []).length >= 3],
  ['Existing finance workspace still loads canonical snapshots', page.includes('getFinanceOperations360(30)') && page.includes('getFinanceControl360(30)')],
  ['Existing invoice lifecycle client wrapper retained', lib.includes("supabase.rpc('transition_invoice_lifecycle'")],
  ['Migration manifest documents Phase 10 hardening', manifest.includes('20261107150000_finance_invoice_lifecycle_hardening.sql')],
  ['No duplicate migration timestamp', (() => { const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')); const versions=files.map(f=>f.split('_')[0]); return new Set(versions).size===versions.length; })()],
];
for (const [label, passed] of checks) {
  assert.equal(passed, true, label);
  console.log(`PASS ${label}`);
}
console.log(`Phase 10 Finance & Billing hardening: ${checks.length}/${checks.length} passed.`);
