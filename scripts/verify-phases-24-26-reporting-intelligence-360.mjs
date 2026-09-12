import fs from 'node:fs';

const migration = 'supabase/migrations/20260912200000_069_reporting_operational_intelligence_360.sql';
const page = 'src/pages/admin/reports.tsx';
const pkg = 'package.json';
const ci = '.github/workflows/ci.yml';
const docs = 'docs/PHASES_24_26_REPORTING_OPERATIONAL_INTELLIGENCE_360.md';
for (const file of [migration,page,pkg,ci,docs]) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const sql = fs.readFileSync(migration,'utf8');
for (const token of [
  'get_reporting_operational_intelligence_360',
  "require_staff_permission('reports','read')",
  'communication_inbound',
  'communication_outbox',
  'service_cases',
  'order_items',
  'orders_by_status',
  'quotes_by_status',
  'revenue_trend',
  'REVOKE ALL ON FUNCTION',
  'GRANT EXECUTE ON FUNCTION public.get_reporting_operational_intelligence_360(integer) TO authenticated'
]) if (!sql.includes(token)) throw new Error(`Missing SQL control: ${token}`);
const source = fs.readFileSync(page,'utf8');
if (!source.includes("get_reporting_operational_intelligence_360")) throw new Error('Reports page does not use the canonical reporting RPC');
if (source.includes("from('orders')") || source.includes("from('quotations')") || source.includes("from('order_items')")) throw new Error('Reports page still performs direct aggregate browser queries');
const p = JSON.parse(fs.readFileSync(pkg,'utf8'));
if (!p.scripts?.['verify:phases-24-26-reporting-intelligence-360']) throw new Error('Missing package verifier');
if (!fs.readFileSync(ci,'utf8').includes('verify:phases-24-26-reporting-intelligence-360')) throw new Error('CI does not run the reporting verifier');
console.log('Phases 24–26 Reporting Operational Intelligence 360 verification passed.');
