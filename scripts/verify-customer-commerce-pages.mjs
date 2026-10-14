import fs from 'node:fs';

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const portal = fs.readFileSync('src/pages/portal.tsx', 'utf8');
const cart = fs.readFileSync('src/pages/cart.tsx', 'utf8');
const quote = fs.readFileSync('src/pages/quotation.tsx', 'utf8');
const commerce = fs.readFileSync('src/lib/commerce.ts', 'utf8');
const cartHook = fs.readFileSync('src/hooks/use-cart.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

check('My Account route remains registered', app.includes("'/portal': Portal") || app.includes("'/portal'"));
check('Cart route remains registered', app.includes("'/cart': Cart") || app.includes("'/cart'"));
check('Quotation route remains registered', app.includes("'/quotation': Quotation") || app.includes("'/quotation'"));
check('Customer account uses Supabase auth and existing portal service', portal.includes('supabase.auth.getSession()') && portal.includes('getCustomerPortal360()'));
check('Customer account retains password, magic-link and registration flows', portal.includes('signInCustomer(') && portal.includes('requestCustomerMagicLink(') && portal.includes('registerCustomerAccount('));
check('Customer portal retains customer lifecycle self-service workflows', ['getCustomerJourney(', 'getCustomerPortalDocuments(', 'getCustomerPortalPreferences(', 'getCustomerCommunicationsSelfService360(', 'createServiceCase(', 'submitServiceCaseFeedback('].every(x => portal.includes(x)));
check('Customer portal retains invoice/order payment gateway initiation', portal.includes('initiateCustomerPayment(') && portal.includes('startPayment('));
check('Cart retains local persistence and variant-aware cart identity', cartHook.includes("localStorage.getItem('flooring_app_cart')") && cartHook.includes('item.variant?.id === action.variant?.id'));
check('Cart uses authoritative secure order RPC wrapper', cart.includes('createCustomerOrder(') && commerce.includes("supabase.rpc('create_secure_customer_order'"));
check('Cart requires available payment method before order creation', cart.indexOf('if (!paymentMethod || !paymentGatewayKey)') > -1 && cart.indexOf('if (!paymentMethod || !paymentGatewayKey)') < cart.indexOf('const result = await createCustomerOrder('));
check('Cart coupon validation remains server-backed and invalidates after subtotal changes', cart.includes('validateCoupon(couponCode, totalPrice)') && cart.includes('Your cart changed. Please reapply the coupon'));
check('Cart payment initiation retains idempotency and return route', cart.includes('checkout-payment:${checkoutIdempotencyKey}') && cart.includes('/payment-return'));
check('Quotation submission preserves canonical quotation RPC', quote.includes('submitQuotationRequest(') && commerce.includes("supabase.rpc('submit_quotation_request'"));
check('Quotation validates positive area and project location', quote.includes('area <= 0') && quote.includes("if (!form.location.trim())"));
check('Quotation budget clearly labels itself indicative and avoids unsupported guarantees', quote.includes('Indicative Budget Range (KES)') && !quote.includes('Guaranteed 24h Turnaround') && !quote.includes('within 24h'));
check('Forms expose customer-facing accessible labels and status feedback', cart.includes('aria-label="Delivery area"') && quote.includes('aria-label="Total project area in square metres"') && portal.includes('aria-live="polite"'));

let failed = 0;
for (const result of checks) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}`);
  if (!result.pass) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exitCode = 1;
