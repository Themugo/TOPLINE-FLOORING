import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const createdTables = new Map();
const createdFunctions = new Map();
const refs = [];
const errors = [];

function stripSql(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
}

for (let index = 0; index < files.length; index += 1) {
  const file = files[index];
  const sql = stripSql(fs.readFileSync(path.join(dir, file), 'utf8'));

  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi)) {
    const name = match[1].toLowerCase();
    if (createdTables.has(name)) errors.push(`${file}: duplicate canonical table definition for ${name}; first defined in ${createdTables.get(name).file}`);
    else createdTables.set(name, { file, index });
  }

  for (const match of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gi)) {
    createdFunctions.set(match[1].toLowerCase(), { file, index });
  }

  for (const match of sql.matchAll(/references\s+(?:(public|auth)\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gi)) {
    refs.push({ schema: (match[1] || 'public').toLowerCase(), table: match[2].toLowerCase(), file, index });
  }
}

for (const ref of refs) {
  if (ref.schema === 'auth' && ref.table === 'users') continue;
  if (ref.schema !== 'public') {
    errors.push(`${ref.file}: unsupported external FK schema ${ref.schema}.${ref.table}`);
    continue;
  }
  const target = createdTables.get(ref.table);
  if (!target) errors.push(`${ref.file}: unresolved table reference public.${ref.table}`);
  else if (target.index > ref.index) errors.push(`${ref.file}: FK public.${ref.table} is defined in a later migration (${target.file})`);
}

const requiredRpcs = [
  'submit_quotation_request', 'validate_coupon', 'create_customer_order', 'create_purchase_order',
  'add_purchase_order_item', 'receive_purchase_order_item', 'transfer_stock', 'convert_lead_to_customer',
  'convert_quotation_to_order', 'create_site_visit', 'create_invoice_transaction',
  'record_invoice_payment_transaction', 'queue_customer_message', 'get_customer_journey',
  'get_customer_portal_data', 'create_product_admin', 'update_product_admin', 'delete_product_admin',
  'resolve_inventory_alert', 'set_primary_product_image', 'claim_communication_outbox',
  'complete_communication_delivery', 'fail_communication_delivery', 'retry_communication_outbox',
  'cancel_communication_outbox', 'get_system_health_snapshot', 'get_customer_portal_360',
  'get_installation_operations_360', 'get_inventory_procurement_operations_360',
  'get_finance_operations_360', 'get_finance_communications_analytics_360',
  'get_reporting_operational_intelligence_360'
];

const missing = requiredRpcs.filter((name) => !createdFunctions.has(name));
if (missing.length) errors.push(`Missing canonical RPC definitions: ${missing.join(', ')}`);

if (errors.length) {
  console.error('Database dependency verification failed.');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Database dependency verification passed (${files.length} migrations, ${createdTables.size} tables, ${createdFunctions.size} functions, ${refs.length} FK references).`);
