import fs from 'node:fs';
import path from 'node:path';
const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
const pkg = JSON.parse(read('package.json'));
const ci = read('.github/workflows/ci.yml');
const customer = read('src/lib/customer-portal.ts');
const admin = read('src/hooks/use-data.ts');
const guard = read('src/components/admin/AdminGuard.tsx');
const portal = read('src/pages/portal.tsx');
const login = read('src/pages/admin/login.tsx');
const adminSettings = read('src/pages/admin/settings.tsx');
const runner = read('scripts/run-g10-auth-uat.mjs');
const runbook = read('docs/G-10-AUTHENTICATION-UAT-RUNBOOK.md');
const checks = [
  ['package registers static verifier', pkg.scripts['verify:g10-auth-certification'] === 'node scripts/verify-g10-auth-certification.mjs'],
  ['package registers live staging UAT', pkg.scripts['uat:g10-auth'] === 'node scripts/run-g10-auth-uat.mjs'],
  ['CI runs G-10 source contract', ci.includes('npm run verify:g10-auth-certification')],
  ['customer registration uses Supabase signUp', /supabase\.auth\.signUp/.test(customer)],
  ['customer registration normalizes email', /email: input\.email\.trim\(\)\.toLowerCase\(\)/.test(customer)],
  ['customer confirmation uses token-hash verification', /verifyOtp\(\{ token_hash: tokenHash, type \}\)/.test(customer)],
  ['customer can resend signup verification', /auth\.resend\(\{[\s\S]*?type: 'signup'/.test(customer)],
  ['customer recovery request uses neutral account-existence messaging', /resetPasswordForEmail/.test(customer) && /Check your email/.test(portal)],
  ['customer recovery updates password through authenticated session', /auth\.updateUser\(\{ password: newPassword \}\)/.test(customer)],
  ['customer auth listener handles password recovery', /PASSWORD_RECOVERY/.test(portal)],
  ['admin registration is email-confirmation based', /auth\.signUp/.test(login) && /emailRedirectTo/.test(login)],
  ['admin recovery route is configured', /resetPasswordForEmail/.test(login) && /admin\/settings/.test(login)],
  ['admin recovery destination supports authenticated password update', /supabase\.auth\.updateUser\(updates\)/.test(adminSettings) && /New Password/.test(adminSettings)],
  ['admin login requires active staff profile', /if \(!profile\?\.is_active\)/.test(admin)],
  ['admin unauthorized identity is signed out', /await supabase\.auth\.signOut\(\)/.test(admin)],
  ['admin route guard verifies server-side user and active profile', /supabase\.auth\.getUser\(\)/.test(guard) && /profile\?\.is_active/.test(guard)],
  ['auth hook handles refresh and identity changes', /onAuthStateChange\(\(_event, session\)/.test(admin) && /refreshSession|TOKEN_REFRESHED|onAuthStateChange/.test(admin)],
  ['staging UAT rejects production project and domain', runner.includes("projectRef === 'cvjmfplhdlfvqnnmzqcp'") && /production application hostname is prohibited/i.test(runner)],
  ['staging UAT requires explicit safety opt-in', runner.includes('TOPLINE_ALLOW_AUTH_UAT') && runner.includes("!== 'true'")],
  ['live runner tests registration, confirmation, recovery, refresh and logout', ['signUp(', 'verifyOtp(', 'resetPasswordForEmail(', 'refreshSession(', 'signOut('].every(s => runner.includes(s))],
  ['evidence excludes passwords and tokens', runner.includes('test_email_sha256') && runner.includes('No password, anon key, access token, refresh token or email token')],
  ['runbook distinguishes live evidence from source checks', /live staging/i.test(runbook) && /G-10 remains OPEN/i.test(runbook) && /not run|not live/i.test(runbook)],
];
let passed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (ok) passed++; }
console.log(`G-10 authentication source verifier: ${passed}/${checks.length} passed.`);
if (passed !== checks.length) process.exit(1);
