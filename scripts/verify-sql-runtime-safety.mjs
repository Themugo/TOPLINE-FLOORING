import fs from 'node:fs';
import path from 'node:path';

// Static guards for defects that only show up when SQL runs (and so pass a plain syntax check).
// The authoritative check is supabase/tests/runtime_contracts.sql, which executes the code.
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
// Code only: comments may legitimately describe the old, broken call.
const code = (p) => read(p).split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const dir = 'supabase/migrations';
const files = fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.sql')).sort();

// 1. pgcrypto functions are not in pg_catalog. A function that hashes with pg_catalog.digest()
//    fails on every call. Older migrations that did so must be superseded by a later definition.
const FIX_HASH = '20261004110000_fix_payment_event_payload_hash.sql';
check(files.includes(FIX_HASH), `${FIX_HASH} is missing`);
for (const f of files.filter((x) => x > FIX_HASH)) {
  check(!/pg_catalog\.(digest|hmac|gen_random_bytes)\(/i.test(code(`${dir}/${f}`)), `${f}: pg_catalog.digest/hmac does not exist; use pg_catalog.sha256() or the extensions schema`);
}
for (const fn of ['apply_payment_provider_event', 'apply_customer_payment_provider_event']) {
  const latest = [...files].reverse().find((f) => new RegExp(`FUNCTION public\\.${fn}\\(`, 'i').test(read(`${dir}/${f}`)));
  check(latest && !/pg_catalog\.digest\(/.test(code(`${dir}/${latest}`)), `latest definition of ${fn} (${latest}) still calls pg_catalog.digest()`);
}

// 2. A STABLE/IMMUTABLE function must not write. PostgreSQL raises at call time.
const FIX_PORTAL = '20261004100000_fix_customer_portal_data_volatility.sql';
check(files.includes(FIX_PORTAL) && /get_customer_portal_data\(\) VOLATILE/.test(read(`${dir}/${FIX_PORTAL}`)), 'get_customer_portal_data() must be declared VOLATILE (it updates last_login)');
for (const f of files.filter((x) => x > FIX_PORTAL)) {
  const sql = code(`${dir}/${f}`);
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.get_customer_portal_data\(\)[\s\S]*?\$function\$/gi)) {
    check(!/\bSTABLE\b/.test(m[0]), `${f}: get_customer_portal_data must not be STABLE`);
  }
}

// 3. PostgreSQL has no min()/max() for uuid; use (array_agg(id))[1] when a single row is expected.
const FIX_SQL = '20261004120000_fix_runtime_sql_errors.sql';
check(files.includes(FIX_SQL), `${FIX_SQL} is missing`);
for (const f of files.filter((x) => x > FIX_SQL)) {
  check(!/\b(min|max)\(\s*(c\.)?id\s*\)/i.test(code(`${dir}/${f}`)), `${f}: min()/max() on a uuid id does not exist; use (array_agg(id))[1]`);
}
for (const fn of ['emit_customer_journey_event', 'record_inbound_communication_worker', 'prepare_customer_registration']) {
  const latest = [...files].reverse().find((f) => new RegExp(`FUNCTION public\\.${fn}\\(`, 'i').test(read(`${dir}/${f}`)));
  check(latest && !/\b(min|max)\(\s*(c\.)?id\s*\)/i.test(code(`${dir}/${latest}`)), `latest definition of ${fn} (${latest}) still uses min()/max() on a uuid`);
}
for (const testFile of ['supabase/tests/runtime_contracts.sql', 'supabase/tests/plpgsql_static_analysis.sql']) {
  check(fs.existsSync(path.join(root, testFile)), `${testFile} is missing`);
}

// 4. The runtime test must exist and be TAP-compliant so `supabase test db --local` runs it.
const t = read('supabase/tests/runtime_contracts.sql');
check(/SELECT plan\(\d+\)/.test(t) && /finish\(\)/.test(t) && /ROLLBACK;/.test(t), 'runtime_contracts.sql must be a rolled-back pgTAP test (plan + finish)');
for (const needle of ['apply_payment_provider_event', 'get_customer_portal_data', 'create_secure_customer_order', "'finance'", 'queue_customer_message', 'claim_communication_outbox_worker', 'complete_communication_delivery_worker']) {
  check(t.includes(needle), `runtime_contracts.sql must exercise ${needle}`);
}

// 5. The browser-RPC grant test must list exactly the RPCs the source calls.
{
  const { browserRpcNames } = await import('./rpc-names.mjs');
  const expected = browserRpcNames(root);
  const sqlPath = 'supabase/tests/browser_rpc_grants.sql';
  check(fs.existsSync(path.join(root, sqlPath)), `${sqlPath} is missing (run node scripts/generate-rpc-grant-test.mjs)`);
  if (fs.existsSync(path.join(root, sqlPath))) {
    const listed = [...read(sqlPath).matchAll(/^\s*\('([a-z_0-9]+)'\)[,;]?$/gm)].map((m) => m[1]).sort();
    const missing = expected.filter((n) => !listed.includes(n));
    const extra = listed.filter((n) => !expected.includes(n));
    check(missing.length === 0 && extra.length === 0, `${sqlPath} is out of date (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}). Run node scripts/generate-rpc-grant-test.mjs`);
  }
}

if (failures.length) { console.error('SQL runtime safety verification FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('SQL runtime safety static verification PASSED.');
