import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function ok(name, condition, detail='') { checks.push({ name, pass: Boolean(condition), detail }); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

const migration = read('supabase/migrations/20260914122211_113_brevo_email_integration_360.sql');
const worker = read('supabase/functions/deliver-communications/index.ts');
const webhook = read('supabase/functions/communication-provider-webhook/index.ts');
const testFn = read('supabase/functions/brevo-test-email/index.ts');
const control = read('src/pages/admin/site-control.tsx');
const envExample = fs.existsSync(path.join(root,'.env.example')) ? read('.env.example') : '';

ok('Brevo migration exists', migration.includes("provider='brevo'"));
ok('Brevo API secret is named', migration.includes("BREVO_API_KEY"));
ok('No secret value in migration', !/BREVO_API_KEY\s*[:=]\s*['\"][^'\"]+['\"]/.test(migration));
ok('Transactional worker uses Brevo API', worker.includes('https://api.brevo.com/v3/smtp/email') && worker.includes('BREVO_API_KEY'));
ok('Transactional worker uses idempotency header', worker.includes('Idempotency-Key'));
ok('Webhook is provider-scoped', webhook.includes('p_provider: "brevo"'));
ok('Brevo test function requires authenticated staff', testFn.includes('auth.getUser(token)') && testFn.includes('staff_profiles'));
ok('Brevo test function handles CORS preflight', testFn.includes('req.method === \"OPTIONS\"') && testFn.includes('Access-Control-Allow-Origin') && testFn.includes('Access-Control-Allow-Headers'));
ok('Brevo test function records provider test state', testFn.includes('recordTest') && testFn.includes('last_tested_at') && testFn.includes('status: \"healthy\"'));
ok('Brevo test function requires settings permission', testFn.includes('p.resource === "settings"'));
ok('Brevo test function reads secret only from Edge env', testFn.includes('Deno.env.get("BREVO_API_KEY")') && !testFn.includes('import.meta.env.BREVO_API_KEY'));
ok('Admin control plane keeps secrets out of browser', control.includes('secrets remain in the deployment secret store'));
ok('Public site-control reads use non-session client', read('src/lib/site-control.ts').includes('publicSupabase') && read('src/components/ThemeApplier.tsx').includes('publicSupabase'));
ok('Auth SMTP setup is documented in env/config docs', envExample.includes('BREVO') || fs.existsSync(path.join(root,'docs','BREVO-EMAIL-INTEGRATION-RUNBOOK.md')));

const failed = checks.filter(c => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
console.log(`Brevo verifier: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
