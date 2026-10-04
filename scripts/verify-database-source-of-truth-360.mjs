import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const fail = (m) => { console.error(`FAIL ${m}`); process.exit(1); };
// The active chain length is derived from disk and cross-checked against the manifest by the migration verifiers.
if (files.length < 111) fail(`expected at least 111 migrations, found ${files.length}`);
if (new Set(files.map((f) => f.slice(0,14))).size !== files.length) fail('migration timestamps are not unique');
const required = [
  '20261002130000_customer_registration_and_reconciliation_360.sql',
  '20261002140000_communications_comm_01_03_contract_state_matching_360.sql',
  '20261002150000_communications_comm_04_06_provider_templates_routing_360.sql',
  '20261002160000_communications_comm_07_09_customer_admin_360.sql',
  '20261002170000_communications_comm_10_12_conversations_scheduler_activation_360.sql',
  '20261002180000_communications_comm_13_17_certification_observability_release_360.sql',
  '20261002190000_payment_gateway_customer_visibility_admin_control_360.sql',
  '20261002200000_payment_initiation_reconciliation_360.sql',
  '20261002210000_payment_provider_certification_activation_360.sql',
  '20261002220000_payment_customer_ux_and_mpesa_hardening_360.sql',
];
for (const f of required) if (!files.includes(f)) fail(`missing canonical migration ${f}`);
const combined = files.map(f => fs.readFileSync(path.join(dir,f), 'utf8')).join('\n');
for (const token of [
  'communication_event_catalog',
  'communication_delivery_state_transitions',
  'communication_provider_contracts',
  'communication_conversations',
  'automation_job_runs',
  'communication_provider_activation',
  'get_customer_communications_self_service_360',
  'get_communications_center_360',
  'prepare_customer_registration',
  'payment_gateway_methods',
  'payment_attempts',
  'payment_provider_certifications',
  'get_payment_provider_release_gate_360',
]) if (!combined.includes(token)) fail(`canonical migration chain missing ${token}`);
console.log(`PASS database source-of-truth: ${files.length} migrations, unique timestamps, required customer + COMM-01–17 contracts present`);
