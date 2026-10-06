import fs from 'node:fs';
import path from 'node:path';

// Supabase CLI deploys every function with verify_jwt = true unless supabase/config.toml says otherwise.
// A function that authenticates callers itself (provider webhooks, browser calls authorised by a
// one-time token) is unreachable in production under that default. This check makes the deploy
// behaviour explicit for every function directory.
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const config = read('supabase/config.toml');
const fnRoot = path.join(root, 'supabase/functions');
const functions = fs.readdirSync(fnRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
  .map((e) => e.name);

const setting = (name) => {
  const m = config.match(new RegExp(`\\[functions\\.${name.replace(/[-]/g, '\\-')}\\]\\s*\\nverify_jwt\\s*=\\s*(true|false)`));
  return m ? m[1] === 'true' : null;
};

for (const name of functions) {
  const src = read(`supabase/functions/${name}/index.ts`);
  const configured = setting(name);
  if (configured === null) { failures.push(`${name}: no [functions.${name}] verify_jwt entry in supabase/config.toml (CLI default is true)`); continue; }
  // Code that documents or implements its own authentication needs verify_jwt = false.
  const selfAuthenticated = /verify_jwt is disabled|x-payment-signature|constantTimeEqual|MPESA_CALLBACK_SECRET|worker secret|WORKER_SECRET|WEBHOOK_SECRET/i.test(src);
  const usesUserJwt = /auth\.getUser\(|Authorization.*Bearer|req\.headers\.get\(["']authorization["']\)/i.test(src) && !selfAuthenticated;
  if (selfAuthenticated && configured) failures.push(`${name}: authenticates callers itself but config.toml has verify_jwt = true (every call would get 401)`);
  if (usesUserJwt && !configured) failures.push(`${name}: relies on the caller's user JWT but config.toml has verify_jwt = false`);
}
for (const m of config.matchAll(/\[functions\.([a-z0-9-]+)\]/g)) {
  if (!functions.includes(m[1])) failures.push(`config.toml configures unknown function ${m[1]}`);
}

// Every outbound provider call must be bounded, otherwise a provider outage hangs the function until the platform kills it.
for (const name of functions) {
  const src = read(`supabase/functions/${name}/index.ts`);
  const fetches = [...src.matchAll(/await fetch\(/g)].length;
  const timeouts = [...src.matchAll(/AbortSignal\.timeout\(/g)].length;
  if (fetches > timeouts) failures.push(`${name}: ${fetches} outbound fetch call(s) but only ${timeouts} timeout(s)`);
}

if (failures.length) { console.error('Edge function deploy configuration FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log(`Edge function deploy configuration verified for ${functions.length} functions.`);
