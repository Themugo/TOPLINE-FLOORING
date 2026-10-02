import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (m) => { console.error(`FAIL: ${m}`); process.exitCode = 1; };
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const migrationDir = path.join(root,'supabase','migrations');
const migrations = fs.readdirSync(migrationDir).filter(f=>f.endsWith('.sql')).sort();
const migration = '20261002140000_communications_comm_01_03_contract_state_matching_360.sql';
if (!migrations.includes(migration)) fail('COMM-01–03 migration missing');
else {
  const sql = read(path.join('supabase/migrations',migration));
  for (const x of [
    'communication_event_catalog','quotation.status','order.status','project.status','invoice.status','payment.received','site_visit.scheduled',
    'communication_delivery_state_transitions','communication_delivery_state_rank','apply_communication_delivery_state_worker',
    'record_provider_delivery_event_worker','match_status','duplicate_email_match','duplicate_phone_match',
    'communication.inbound.review','record_inbound_communication_worker'
  ]) if (!sql.includes(x)) fail(`COMM-01–03 contract missing: ${x}`);
  if (/ORDER BY created_at ASC LIMIT 1/.test(sql)) fail('Unsafe oldest-customer inbound selection remains in COMM-01–03 migration');
  if (!sql.includes("v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'")) fail('Ambiguous inbound matching is not fail-closed');
  if (!sql.includes('communication_delivery_state_rank(v_new) < public.communication_delivery_state_rank(v_old)')) fail('Delivery state monotonicity guard missing');
}
const pkg = JSON.parse(read('package.json'));
if (!pkg.scripts['verify:communications-comm-01-03']) fail('Package verifier command missing');
const times = migrations.map(f=>f.slice(0,14));
if (new Set(times).size !== times.length) fail('Duplicate migration timestamps detected');
if (!process.exitCode) console.log(`COMM-01–03 static verification PASSED: ${migration}`);
