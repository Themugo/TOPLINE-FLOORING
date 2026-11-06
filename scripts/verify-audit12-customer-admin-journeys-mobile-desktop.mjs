import fs from 'node:fs';

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const paymentMethods = fs.readFileSync('src/components/customer/CustomerPaymentMethods.tsx', 'utf8');
const dialog = fs.readFileSync('src/components/ui/dialog.tsx', 'utf8');
const adminLayout = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');
const customerLayout = fs.readFileSync('src/components/layout/CustomerLayout.tsx', 'utf8');
const mobileActionBar = fs.readFileSync('src/components/layout/MobileActionBar.tsx', 'utf8');
const portal = fs.readFileSync('src/pages/portal.tsx', 'utf8');
const trackOrder = fs.readFileSync('src/pages/track-order.tsx', 'utf8');
const phase12Migration = fs.readFileSync('supabase/migrations/20261106230000_audit12_journey_regression_hardening.sql', 'utf8');
const configChecklist = fs.readFileSync('docs/CONFIGURATION-CHECKLIST.md', 'utf8');

check('Customer payment failure state is announced and retryable', paymentMethods.includes('role="alert"') && paymentMethods.includes('Retry payment options') && paymentMethods.includes('type="button"'));
check('Payment option retry re-runs the context-bound loader', paymentMethods.includes('retryNonce') && paymentMethods.includes('[context, retryNonce]'));
check('Shared dialogs remain usable on short mobile viewports', dialog.includes('max-h-[calc(100dvh-2rem)]') && dialog.includes('overflow-y-auto') && dialog.includes('overscroll-contain'));
check('Customer portal keeps dashboard refresh and sign-out actions', portal.includes('loadDashboard()') && portal.includes('signOutCustomer()'));
check('Customer order recovery keeps provider-confirmed payment messaging', trackOrder.includes('Resume payment') && trackOrder.includes('Payment status is confirmed by the provider callback'));
check('Admin shell retains mobile drawer, safe-area and offline affordances', adminLayout.includes('h-dvh') && adminLayout.includes('overscroll-contain') && adminLayout.includes('safe-area') && adminLayout.includes('offline'));
check('Customer shell retains mobile navigation and safe-area spacing', customerLayout.includes('safe-area') && mobileActionBar.includes('Primary mobile navigation') && mobileActionBar.includes('env(safe-area-inset-bottom)'));
check('Phase 12 makes storage RLS explicit for migration replay', /ALTER TABLE IF EXISTS storage\.objects ENABLE ROW LEVEL SECURITY/i.test(phase12Migration));
check('Customer data functions have documented anon-key configuration', configChecklist.includes('`SUPABASE_ANON_KEY`') && configChecklist.includes('customer-data-export, customer-document-download'));

let failed = 0;
for (const result of checks) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}`);
  if (!result.pass) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exitCode = 1;
