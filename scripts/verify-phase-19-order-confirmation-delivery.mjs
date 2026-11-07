import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const migrationName = '20261107210000_phase_19_order_confirmation_delivery_reliability.sql';
const migration = read(`supabase/migrations/${migrationName}`);
const manifest = read('supabase/MIGRATION_MANIFEST.md');
const router = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.queue_customer_notification_for_event'), migration.indexOf('CREATE OR REPLACE FUNCTION public.emit_customer_journey_event'));
const journey = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.emit_customer_journey_event'), migration.indexOf('-- Staff order detail'));
const rpc = migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION public.get_order_communication_delivery_360'));
const orders = read('src/pages/admin/orders.tsx');
const generatedTypes = read('src/types/database.ts');
const pkg = JSON.parse(read('package.json'));
const ci = read('.github/workflows/ci.yml');
const checks = [
  ['Phase 19 migration exists and is registered', exists(`supabase/migrations/${migrationName}`) && manifest.includes(migrationName)],
  ['The canonical notification router queues email for transactional order status even when optional email preferences are off', /r\.email_enabled AND \(pref\.email_enabled OR p_event_type = 'order\.status'\)/.test(router) && router.includes('communication_outbox')],
  ['The router keeps its configured event rule and delivery suppression boundary', /WHERE event_type=p_event_type AND enabled/.test(router) && /ON CONFLICT DO NOTHING/.test(router)],
  ['The final order journey trigger restores event-to-outbox queueing', /queue_customer_notification_for_event\(et, eid, cid, new_status\)/.test(journey)],
  ['Order rows use the canonical order.status event', /et := 'order\.status'/.test(journey)],
  ['Legacy orders resolve only a unique exact email match', /count\(\*\), \(array_agg\(c\.id\)\)\[1\]/.test(journey) && /IF v_match_count <> 1 THEN cid := NULL/.test(journey)],
  ['Status-only updates with no actual status change do not emit duplicates', /old_status IS NOT DISTINCT FROM new_status THEN RETURN NEW/.test(journey)],
  ['Notification event and durable outbox call share the order transaction', journey.indexOf('INSERT INTO public.notification_events') < journey.indexOf('queue_customer_notification_for_event')],
  ['Order communication RPC is staff permission-gated', /require_staff_permission\('orders', 'select'\)/.test(rpc)],
  ['Order communication RPC returns delivery state and provider evidence', ['delivery_status','attempt_count','provider_message_id','error_message','sent_at'].every((x) => rpc.includes(`'${x}'`))],
  ['Order communication lookup is scoped to the exact order dedupe key', /dedupe_key LIKE 'order\.status:' \|\| p_order_id::text/.test(rpc)],
  ['RPC does not expose provider secrets or payload bodies', !/api[_-]?key|service_role|provider_payload/i.test(rpc)],
  ['Order detail exposes queued/accepted/delivered/failed evidence', orders.includes('Customer confirmation & delivery') && orders.includes('Accepted by provider') && orders.includes('No order confirmation or status message')],
  ['Generated Supabase RPC type is present', generatedTypes.includes('get_order_communication_delivery_360: { Args: { p_order_id: string }; Returns: Json }')],
  ['Phase 19 verifier is registered in npm and CI', pkg.scripts['verify:phase-19-order-confirmation-delivery'] === 'node scripts/verify-phase-19-order-confirmation-delivery.mjs' && ci.includes('npm run verify:phase-19-order-confirmation-delivery')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`Phase 19 order confirmation & delivery reliability: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
