import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const functionsDir = path.join(root, 'supabase', 'functions');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
const latest = files.at(-1) ?? '';
if (!latest.startsWith('20260913170000_094_application_security_trust_boundary_360.sql')) {
  throw new Error(`Expected security boundary migration 094 as latest migration, found ${latest}`);
}

const migration = fs.readFileSync(path.join(migrationsDir, latest), 'utf8');
for (const token of [
  'REVOKE EXECUTE ON FUNCTION public.expire_inventory_reservations()',
  'REVOKE EXECUTE ON FUNCTION public.release_expired_inventory_reservations()',
  'REVOKE EXECUTE ON FUNCTION public.recalculate_project_costs(uuid)',
  'REVOKE EXECUTE ON FUNCTION public.emit_customer_journey_event()',
  'REVOKE EXECUTE ON FUNCTION public.emit_payment_notification()',
  'REVOKE EXECUTE ON FUNCTION public.emit_site_visit_notification()',
  'REVOKE EXECUTE ON FUNCTION public.link_customer_portal_user()',
  "private.require_staff_permission('finance','update')",
  'REVOKE EXECUTE ON FUNCTION public.create_customer_order',
  'REVOKE EXECUTE ON FUNCTION public.claim_communication_outbox_worker',
]) {
  if (!migration.includes(token)) throw new Error(`Security migration missing: ${token}`);
}

const config = fs.readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
if (!config.includes('[functions.customer-data-export]\nverify_jwt = true')) {
  throw new Error('customer-data-export must require Supabase JWT verification');
}

const edgeExpectations = {
  'customer-data-export/index.ts': ['Authorization', "rpc('create_operational_data_export')"],
  'expire-reservations/index.ts': ["rpc('expire_inventory_reservations')"],
  'deliver-communications/index.ts': ['x-topline-worker-secret', 'TOPLINE_WORKER_SECRET'],
  'communication-provider-webhook/index.ts': ['x-topline-webhook-secret', 'COMMUNICATION_WEBHOOK_SECRET'],
  'email-inbound/index.ts': ['x-topline-webhook-secret', 'EMAIL_INBOUND_SECRET'],
  'sms-inbound/index.ts': ['AT_INBOUND_SECRET'],
  'sms-delivery-report/index.ts': ['AT_DLR_SECRET'],
  'whatsapp-webhook/index.ts': ['WHATSAPP_VERIFY_TOKEN'],
  'payment-webhook/index.ts': ['x-payment-signature', '501'],
};
for (const [relative, tokens] of Object.entries(edgeExpectations)) {
  const file = path.join(functionsDir, relative);
  if (!fs.existsSync(file)) throw new Error(`Missing edge function: ${relative}`);
  const text = fs.readFileSync(file, 'utf8');
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${relative} missing security boundary token: ${token}`);
}

const sourceRoot = path.join(root, 'src');
const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(sourceRoot);
const source = sourceFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
if (source.includes('user_metadata')) throw new Error('Unsafe user_metadata authorization reference found in application source');
if (source.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('service_role key reference found in browser application source');
if (source.includes('VITE_SUPABASE_SERVICE_ROLE')) throw new Error('service-role Vite environment variable found');
if (!source.includes("create_secure_customer_order")) throw new Error('Secure checkout RPC is not referenced by application source');

console.log('Application Security & Trust Boundary static verification PASSED');
