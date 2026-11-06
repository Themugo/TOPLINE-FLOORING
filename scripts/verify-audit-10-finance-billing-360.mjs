import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
 'supabase/migrations/20260912130000_062_finance_billing_operations_360.sql',
 'src/lib/finance-operations.ts',
 'src/pages/admin/finance-operations.tsx',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const migration = fs.readFileSync(path.join(root, required[0]), 'utf8');
for (const token of ['invoice_events','transition_invoice_lifecycle','refresh_invoice_lifecycle_statuses','get_finance_operations_360','require_staff_permission']) if (!migration.includes(token)) throw new Error(`Missing migration contract: ${token}`);
const invoicePage = fs.readFileSync(path.join(root,'src/pages/admin/invoices.tsx'),'utf8');
for (const token of ['transitionInvoiceLifecycle','Status change rejected']) if (!invoicePage.includes(token)) throw new Error(`Invoice UI not hardened: ${token}`);
const app = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
if (!app.includes("'/admin/finance-operations': AdminFinanceOperations")) throw new Error('Finance Operations route missing');
const migrations = fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql'));
const versions = migrations.map(f=>f.split('_')[0]);
if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration timestamps detected');
console.log(`Phase 10 Finance & Billing 360 verification passed. ${migrations.length} migrations; unique versions confirmed.`);
