import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const migrations = fs.readdirSync(path.join(process.cwd(), 'supabase/migrations')).sort();
const authMigrationName = migrations.find((name) => name.includes('customer_auth_trigger_order_hardening'));
const migration = authMigrationName ? read(`supabase/migrations/${authMigrationName}`) : '';
const portal = read('src/pages/portal.tsx');
const customerAuth = read('src/lib/customer-portal.ts');
const adminAuth = read('src/hooks/use-data.ts');
const adminGuard = read('src/components/admin/AdminGuard.tsx');
const failures = [];
let passed = 0;
const check = (ok, label) => {
  if (ok) { passed += 1; console.log(`PASS ${label}`); }
  else failures.push(label);
};

check(Boolean(authMigrationName), 'Migration exists to make customer auth trigger order deterministic');
check(/DROP TRIGGER IF EXISTS on_auth_user_customer_portal ON auth\.users/.test(migration),
  'Old portal-link trigger is removed');
check(/CREATE TRIGGER on_auth_user_z_customer_portal\s+AFTER INSERT OR UPDATE OF email_confirmed_at ON auth\.users/.test(migration),
  'Portal-link trigger runs after registration trigger on INSERT');
check(/on_auth_user_customer_registration/.test(migration) && /on_auth_user_z_customer_portal/.test(migration),
  'Trigger ordering is explicit and documented');
check(/const latestDashboardRequest = useRef\(0\)/.test(portal) &&
  /const requestId = \+\+latestDashboardRequest\.current/.test(portal) &&
  /if \(!isCurrentRequest\(\)\) return/.test(portal),
  'Customer portal dashboard ignores stale auth/data responses');
check(/latestDashboardRequest\.current \+= 1/.test(portal),
  'Customer portal invalidates pending requests on unmount');
check(/onAuthStateChange\(\(event\) =>[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?loadDashboard\(\)/.test(portal),
  'Customer portal defers Supabase calls outside the auth callback lock');
check(/onAuthStateChange\(\(_event, session\) =>[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?checkCurrentStaff\(session\)/.test(adminAuth),
  'Admin auth hook defers Supabase calls outside the auth callback lock');
check(/latestAuthCheck = useRef\(0\)/.test(adminAuth) &&
  /requestId !== latestAuthCheck\.current/.test(adminAuth),
  'Admin auth hook ignores stale profile checks after sign-out or identity changes');
check(/catch \{[\s\S]*?Sign-in could not be completed\. Check your connection and try again\./.test(adminAuth),
  'Admin sign-in handles thrown network failures without leaving loading state stuck');
check(/latestVerification = useRef\(0\)/.test(adminGuard) &&
  /requestId !== latestVerification\.current/.test(adminGuard),
  'Admin route guard ignores stale authorization results');
check(/email: email\.trim\(\)\.toLowerCase\(\)/.test(customerAuth),
  'Customer sign-in normalizes email consistently');
check(/email: input\.email\.trim\(\)\.toLowerCase\(\)/.test(customerAuth),
  'Customer registration normalizes email consistently');
check(/marketing_email_opt_in: input\.marketingEmailOptIn === true/.test(customerAuth),
  'Marketing consent is explicit and opt-in only');
check(/verifyOtp\(\{ token_hash: tokenHash, type \}\)/.test(customerAuth),
  'Email links are confirmed only by explicit token-hash verification action');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`Customer registration and account-access hardening: ${passed}/15 passed.`);
