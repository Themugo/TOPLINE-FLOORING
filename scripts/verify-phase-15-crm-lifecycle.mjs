import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: 'supabase/migrations/20260912170000_066_sales_project_lifecycle_360_hardening.sql',
  client: 'src/lib/lifecycle.ts',
  hooks: 'src/hooks/use-data.ts',
  groupedVerifier: 'scripts/verify-phases-15-17.mjs',
  docs: 'docs/PHASES_15_17_SALES_PROJECT_LIFECYCLE.md',
};
for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Phase 15 contract file: ${file}`);
}
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sql = read(files.migration);
const client = read(files.client);
const hooks = read(files.hooks);
const grouped = read(files.groupedVerifier);
const checks = [
  ['Lead conversion is a server-side transactional RPC', /CREATE OR REPLACE FUNCTION public\.convert_lead_to_customer\(p_lead_id uuid\)[\s\S]*?LANGUAGE plpgsql SECURITY DEFINER/.test(sql)],
  ['Lead row is locked during conversion', /FROM public\.leads WHERE id = p_lead_id FOR UPDATE/.test(sql)],
  ['Normalized email is used for customer matching', /lower\(trim\(email\)\) = v_email/.test(sql)],
  ['Concurrent conversions serialize on normalized email', /pg_advisory_xact_lock\(hashtextextended\(v_email, 66017\)\)/.test(sql)],
  ['Missing lead email fails closed', /IF v_email = '' THEN[\s\S]*?A lead email is required for customer conversion/.test(sql)],
  ['Existing converted lead returns idempotently', /IF v_lead\.converted_customer_id IS NOT NULL THEN[\s\S]*?already_converted',true/.test(sql)],
  ['Lead conversion persists won state and customer relationship', /status='won', converted_customer_id=v_customer\.id, outcome='won'/.test(sql)],
  ['Conversion writes an audit event', /'lead_converted',v_lead\.id,v_customer\.id,'won'/.test(sql)],
  ['RPC uses a pinned search path', /SECURITY DEFINER SET search_path = public, pg_temp/.test(sql)],
  ['RPC is not executable by PUBLIC or anonymous users', /REVOKE ALL ON FUNCTION public\.convert_lead_to_customer\(uuid\) FROM PUBLIC, anon/.test(sql)],
  ['RPC is explicitly executable by authenticated users', /GRANT EXECUTE ON FUNCTION public\.convert_lead_to_customer\(uuid\) TO authenticated/.test(sql)],
  ['Frontend exposes the transactional lead conversion wrapper', /convertLeadToCustomer/.test(client) && /convertLeadToCustomer/.test(hooks)],
  ['Combined Phase 15–17 verifier remains part of the contract', /convert_lead_to_customer/.test(grouped) && /sales_project_lifecycle_events/.test(grouped)],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`Phase 15 CRM lifecycle: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
