import fs from 'node:fs';

const hookPath = 'src/hooks/use-data.ts';
const pagePath = 'src/pages/admin/invoices.tsx';
const migrationPath = 'supabase/migrations/20260910160000_finance_communications_analytics.sql';

for (const file of [hookPath, pagePath, migrationPath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

const hook = fs.readFileSync(hookPath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

if (/removeInvoiceItem\s*=\s*async[^\n]*_taxRate/.test(hook)) {
  throw new Error('removeInvoiceItem still declares an unused taxRate parameter');
}
if (/addInvoiceItem\s*=\s*async[^\n]*taxRate/.test(hook)) {
  throw new Error('addInvoiceItem still declares an unused taxRate parameter');
}
if (/removeInvoiceItem\([^\n]*current\.tax_rate/.test(page)) {
  throw new Error('Invoice admin page still passes tax_rate to removeInvoiceItem');
}
if (/\}, current\.tax_rate\);/.test(page)) {
  throw new Error('Invoice admin page still passes tax_rate to addInvoiceItem');
}
if (!/SELECT COALESCE\(sum\(line_total\),0\),tax_rate INTO v_sub,v_taxrate/i.test(migration)) {
  throw new Error('Expected server-side invoice tax-rate derivation was not found in the finance migration');
}

console.log('Invoice hook contract verification PASSED.');
console.log('- Frontend invoice item mutations do not carry unused tax-rate parameters');
console.log('- Invoice tax recalculation remains server-side and derives tax_rate from the persisted invoice');
