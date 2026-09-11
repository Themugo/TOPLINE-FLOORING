import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter(f => f.endsWith('.sql')).sort();
const required = [
  '20260911080000_039_admin_mutation_security.sql',
  '20260911090000_040_communication_outbox_delivery.sql',
  '20260911100000_041_system_health_observability.sql',
];
const errors = [];
for (const f of required) if (!migrations.includes(f)) errors.push(`Missing migration: ${f}`);
const sql = required.map(f => fs.readFileSync(path.join(root,'supabase','migrations',f),'utf8')).join('\n');
for (const fn of ['create_product_admin','update_product_admin','delete_product_admin','resolve_inventory_alert','claim_communication_outbox','complete_communication_delivery','fail_communication_delivery','retry_communication_outbox','cancel_communication_outbox','get_system_health_snapshot']) {
  if (!new RegExp(`create\\s+or\\s+replace\\s+function\\s+(?:public\\.)?${fn}\\b`,'i').test(sql)) errors.push(`Missing Phase 39-41 RPC: ${fn}`);
}
for (const forbidden of ["supabase.from('products').insert", "supabase.from('products').update", "supabase.from('products').delete", "supabase.from('inventory_alerts').update"]) {
  for (const file of ['src/pages/admin/products.tsx','src/pages/admin/inventory.tsx']) {
    const text = fs.readFileSync(path.join(root,file),'utf8');
    if (text.includes(forbidden)) errors.push(`${file} still contains forbidden browser mutation: ${forbidden}`);
  }
}
for (const file of ['src/lib/admin-operations.ts','src/lib/system-health.ts','src/pages/admin/system-health.tsx']) {
  if (!fs.existsSync(path.join(root,file))) errors.push(`Missing implementation file: ${file}`);
}
const app = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
if (!app.includes("'/admin/system-health': AdminSystemHealth")) errors.push('System Health route is not registered');
if (errors.length) { console.error('Phase 39–41 verification failed.'); errors.forEach(e=>console.error(`- ${e}`)); process.exit(1); }
console.log('Phase 39–41 source verification passed.');
