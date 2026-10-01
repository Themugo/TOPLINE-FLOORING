import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const worker = read('supabase/functions/deliver-communications/index.ts');
check((worker.match(/AbortSignal\.timeout\(PROVIDER_TIMEOUT_MS\)/g) || []).length >= 3, 'Every provider fetch (Brevo, SMS, WhatsApp) needs a timeout');
check(worker.includes('findAcceptedAttempt') && worker.includes('"accepted"'), 'Worker must not re-send a message already accepted by the provider');
check(worker.includes('isPermanentFailure') && worker.includes('p_retry: !isPermanentFailure(message)'), 'Permanent provider rejections must not be retried');
check(worker.includes('"started_at"') && !worker.includes('.order("created_at"'), 'communication_delivery_attempts has started_at, not created_at');
check(worker.includes('Idempotency-Key'), 'Existing idempotency header contract must remain');
check(!/BREVO_API_KEY\s*=\s*["'][^"']+["']/.test(worker), 'No hard-coded provider credentials');

const hook = read('supabase/functions/communication-provider-webhook/index.ts');
check(hook.includes('Invalid JSON payload'), 'Webhook must answer 400 to invalid JSON');
check(read('supabase/functions/operations-scheduler/index.ts').includes('AbortSignal.timeout'), 'Scheduler call to worker needs a timeout');

const svc = read('src/pages/service-detail.tsx');
check(!svc.includes('useParams'), 'Service detail must not rely on useParams (manual location routing leaves it empty)');
check(svc.includes('useLocation') && svc.includes('decodeURIComponent'), 'Service detail must derive its slug from the location');
check(svc.includes('finally') && svc.includes('setLoading(false)'), 'Service detail must always leave the loading state');

if (failures.length) { console.error('Delivery worker / service detail verification FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('Delivery worker hardening and service detail static verification PASSED.');
