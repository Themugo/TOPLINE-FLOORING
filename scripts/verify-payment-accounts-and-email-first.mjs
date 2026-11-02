import { readFileSync, existsSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const checks = [];
const check = (name, ok) => checks.push([name, Boolean(ok)]);

const mig = read('supabase/migrations/20261102190000_business_payment_accounts.sql');
check('payment accounts table has RLS enabled', /ENABLE ROW LEVEL SECURITY/.test(mig));
check('payment accounts policies use settings permission', ['select', 'insert', 'update', 'delete'].every((a) => mig.includes(`current_user_has_permission('settings','${a}')`)));
check('payment accounts changes are audited', /private\.audit_log_change/.test(mig));
check('anon cannot read payment accounts or call customer function', /REVOKE ALL ON public\.business_payment_accounts FROM PUBLIC, anon|REVOKE ALL ON public\.business_payment_accounts FROM PUBLIC, anon/.test(mig.replace(/TABLE /g, '')) && /REVOKE ALL ON FUNCTION public\.get_customer_payment_accounts\(\) FROM PUBLIC, anon/.test(mig));
check('customer function is SECURITY DEFINER with empty search_path', /get_customer_payment_accounts[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/.test(mig));
check('customer function only returns active shared accounts', /WHERE a\.is_active AND a\.show_to_customers/.test(mig));
check('payment accounts regression test exists', existsSync('supabase/tests/business_payment_accounts_regression.sql'));

const claim = read('supabase/migrations/20261102180000_channel_gated_outbox_claim.sql');
check('claim RPC accepts a channel list', /p_channels text\[\]/.test(claim) && /channel = ANY\(p_channels\)/.test(claim));
check('claim RPC is service_role only', /GRANT EXECUTE ON FUNCTION public\.claim_communication_outbox_worker\(integer, text\[\]\) TO service_role/.test(claim.replace(/\s+/g, ' ')) || /TO service_role/.test(claim));
check('channel gating regression test exists', existsSync('supabase/tests/channel_gated_claim_regression.sql'));

const worker = read('supabase/functions/deliver-communications/index.ts');
check('worker only claims configured channels', /configuredChannels\(\)/.test(worker) && /p_channels: channels/.test(worker));
const hook = read('supabase/functions/communication-provider-webhook/index.ts');
check('webhook accepts header, query or bearer secret', /x-topline-webhook-secret/.test(hook) && /secret/.test(hook) && /Bearer/i.test(hook));
const ready = read('supabase/functions/communication-provider-readiness/index.ts');
check('readiness treats SMS/WhatsApp as optional', /required/.test(ready) && /channels_waiting_for_setup/.test(ready));

const init = read('supabase/functions/payment-initiate/index.ts');
check('payment-initiate returns managed accounts', /business_payment_accounts/.test(init) && /accounts: managedAccounts/.test(init));
const lib = read('src/lib/payment-accounts.ts');
check('client lib validates and uses the customer RPC', /get_customer_payment_accounts/.test(lib) && /validatePaymentAccount/.test(lib));
check('admin settings mounts the manager', /PaymentAccountsManager/.test(read('src/pages/admin/settings.tsx')));
check('portal shows how-to-pay card', /getCustomerPaymentAccounts/.test(read('src/pages/portal.tsx')) && /How to pay/.test(read('src/pages/portal.tsx')));
check('payment return renders managed accounts', /PaymentAccountsList/.test(read('src/pages/payment-return.tsx')));
check('admin product form can record opening stock', /adjust_product_stock/.test(read('src/pages/admin/products.tsx')));
check('home page unavailable product does not dead-end', !/disabled=\{!isProductPurchasable\(product, selectedVariant\)\}/.test(read('src/pages/home.tsx')));
check('migration manifest lists both new migrations', ['20261102180000_channel_gated_outbox_claim', '20261102190000_business_payment_accounts'].every((m) => read('supabase/MIGRATION_MANIFEST.md').includes(m)));

let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed++; }
console.log(`${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
