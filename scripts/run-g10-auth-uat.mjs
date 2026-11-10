import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createHash } from 'node:crypto';

const fail = (message) => { console.error(`BLOCKED: ${message}`); process.exit(2); };
const env = process.env;
if (env.TOPLINE_AUTH_UAT_ENV !== 'staging') fail('TOPLINE_AUTH_UAT_ENV=staging is required. Production authentication testing is prohibited.');
if (env.TOPLINE_ALLOW_AUTH_UAT !== 'true') fail('Set TOPLINE_ALLOW_AUTH_UAT=true only after confirming this is a disposable staging project.');
const url = env.TOPLINE_AUTH_UAT_SUPABASE_URL || '';
const anonKey = env.TOPLINE_AUTH_UAT_ANON_KEY || '';
const projectRef = env.TOPLINE_AUTH_UAT_PROJECT_REF || '';
const appUrl = env.TOPLINE_AUTH_UAT_APP_URL || '';
const email = (env.TOPLINE_AUTH_UAT_EMAIL || '').trim().toLowerCase();
const password = env.TOPLINE_AUTH_UAT_PASSWORD || '';
const expectedRef = /^[a-z0-9]{20}$/;
if (!expectedRef.test(projectRef)) fail('TOPLINE_AUTH_UAT_PROJECT_REF must be a 20-character staging project ref.');
if (projectRef === 'cvjmfplhdlfvqnnmzqcp') fail('The canonical project in supabase/config.toml is prohibited; use a separate staging project.');
let parsed;
try { parsed = new URL(url); } catch { fail('TOPLINE_AUTH_UAT_SUPABASE_URL must be a valid HTTPS Supabase URL.'); }
if (parsed.protocol !== 'https:' || parsed.hostname !== `${projectRef}.supabase.co`) fail('Supabase URL hostname must exactly match the staging project ref.');
if (!/^https:\/\//.test(appUrl)) fail('TOPLINE_AUTH_UAT_APP_URL must be the HTTPS staging application URL.');
if (!anonKey || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) fail('Provide a staging anon key, dedicated test email and password of at least 12 characters.');
const expectedAppHost = new URL(appUrl).hostname;
if (/(toplinefloorandwaterproofing\.co\.ke|www\.toplinefloorandwaterproofing\.co\.ke)$/i.test(expectedAppHost)) fail('Production application hostname is prohibited.');

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const rl = readline.createInterface({ input, output });
const prompt = async (label) => (await rl.question(`${label}\n> `)).trim();
const checks = [];
const record = (name, ok, detail = '') => { checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) throw new Error(`Authentication UAT failed: ${name}`); };
const outDir = path.join(process.cwd(), 'artifacts', 'g10-auth-uat');
fs.mkdirSync(outDir, { recursive: true });
const startedAt = new Date().toISOString();
let userId = null;
let finished = false;
try {
  console.log(`G-10 STAGING AUTH UAT — ${projectRef}\nA real confirmation and recovery email will be sent to the dedicated test mailbox: ${email}. Do not use a customer or staff account.`);
  const { data: signup, error: signupError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${appUrl.replace(/\/$/, '')}/portal`, data: { topline_customer_registration: true, name: 'G10 Disposable Auth Test', phone: '+254700000000', company: 'G10 UAT' } } });
  if (signupError) throw signupError;
  userId = signup.user?.id ?? null;
  record('registration creates a staging Auth identity', Boolean(userId), userId ? 'user id captured' : 'no user returned');
  record('email confirmation is required before first sign-in', !signup.session, signup.session ? 'unexpected session before verification' : 'signup returned no session');
  const signupHash = await prompt('Open the confirmation email, copy the token_hash value from its staging callback URL, and paste token_hash (not the full URL).');
  if (!signupHash || signupHash.length < 20) throw new Error('A valid confirmation token_hash is required.');
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: signupHash, type: 'signup' });
  if (verifyError) throw verifyError;
  record('email verification consumes the signup token', Boolean(verified.user?.id && verified.user.id === userId), 'verified identity matches registration');
  await supabase.auth.signOut({ scope: 'local' });
  const { data: login, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  record('verified account accepts password sign-in', Boolean(login.session?.access_token && login.user?.id === userId));
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  record('session refresh rotates a valid access token', Boolean(refreshed.session?.access_token && refreshed.user?.id === userId));
  const { data: current, error: currentError } = await supabase.auth.getUser();
  if (currentError) throw currentError;
  record('refreshed session resolves the authenticated identity', current.user?.id === userId);
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl.replace(/\/$/, '')}/portal` });
  if (resetError) throw resetError;
  record('password recovery request is accepted', true, 'recovery email requested');
  const recoveryHash = await prompt('Open the password recovery email, copy token_hash from its callback URL, and paste it here.');
  if (!recoveryHash || recoveryHash.length < 20) throw new Error('A valid recovery token_hash is required.');
  const { data: recovery, error: recoveryError } = await supabase.auth.verifyOtp({ token_hash: recoveryHash, type: 'recovery' });
  if (recoveryError) throw recoveryError;
  record('recovery token establishes the password-update session', recovery.user?.id === userId);
  const newPassword = await prompt('Enter a NEW disposable test password (12+ characters) to complete the recovery flow.');
  if (newPassword.length < 12 || newPassword === password) throw new Error('New password must be at least 12 characters and differ from the original.');
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;
  record('password recovery updates the password', true);
  await supabase.auth.signOut();
  const { data: afterSignOut } = await supabase.auth.getUser();
  record('sign-out clears the local authenticated session', !afterSignOut.user);
  const { data: relogin, error: reloginError } = await supabase.auth.signInWithPassword({ email, password: newPassword });
  if (reloginError) throw reloginError;
  record('updated password supports a fresh sign-in', relogin.user?.id === userId);
  await supabase.auth.signOut();
  record('final sign-out completes', true);
  finished = true;
} catch (error) {
  console.error(error?.message || String(error));
} finally {
  rl.close();
  const summary = {
    suite: 'G-10 real Supabase Auth lifecycle UAT',
    status: finished ? 'PASS' : 'FAIL',
    environment: 'staging',
    project_ref: projectRef,
    app_host: expectedAppHost,
    test_email_sha256: createHash('sha256').update(email).digest('hex'),
    user_id: userId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    checks,
    note: 'No password, anon key, access token, refresh token or email token is written to evidence. Delete the disposable Auth user and associated customer fixture after review.'
  };
  const summaryPath = path.join(outDir, 'auth-uat-summary.json');
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  const logPath = path.join(outDir, 'auth-uat-summary.log');
  fs.writeFileSync(logPath, `${checks.map(c => `${c.status} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`).join('\n')}\nSTATUS ${summary.status}\nPROJECT ${projectRef}\n`);
  console.log(`Evidence: ${path.relative(process.cwd(), summaryPath)} and ${path.relative(process.cwd(), logPath)}`);
}
if (!finished) process.exit(1);
