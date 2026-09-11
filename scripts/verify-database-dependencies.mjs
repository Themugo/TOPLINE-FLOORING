import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const createdTables = new Map();
const refs = [];
const functions = new Map();

for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  const tableMatches = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  for (const m of tableMatches) createdTables.set(m[1].toLowerCase(), file);
  for (const m of sql.matchAll(/references\s+(?:(\w+)\.)?([a-zA-Z0-9_]+)\s*\(/gi)) refs.push({ schema: (m[1] || 'public').toLowerCase(), table: m[2].toLowerCase(), file });
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)) functions.set(m[1], file);
}

const errors = [];
for (const ref of refs) {
  if (ref.schema === 'auth' && ref.table === 'users') continue;
  if (ref.schema !== 'public') continue;
  if (!createdTables.has(ref.table)) {
    // auth.users is the common external dependency; other unresolved references need review.
    errors.push(`${ref.file}: unresolved table reference ${ref.table}`);
  }
}

const requiredRpcs = [
  'submit_quotation_request','validate_coupon','create_customer_order','create_purchase_order',
  'add_purchase_order_item','receive_purchase_order_item','transfer_stock','convert_lead_to_customer',
  'convert_quotation_to_order','create_site_visit','create_invoice_transaction',
  'record_invoice_payment_transaction','queue_customer_message','get_customer_journey','get_customer_portal_data'
];
const missing = requiredRpcs.filter(name => !functions.has(name));
if (missing.length) errors.push(`Missing canonical RPC definitions: ${missing.join(', ')}`);

if (errors.length) {
  console.error('Database dependency verification failed.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Database dependency verification passed (${files.length} migrations, ${createdTables.size} tables, ${functions.size} functions).`);
