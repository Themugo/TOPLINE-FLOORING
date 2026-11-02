import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const track = fs.readFileSync(path.join(root, 'src/pages/track-order.tsx'), 'utf8');
const payments = fs.readFileSync(path.join(root, 'src/lib/customer-payments.ts'), 'utf8');
const tracking = fs.readFileSync(path.join(root, 'src/lib/delivery.ts'), 'utf8');
const checks = [
  ['guest recovery begins with the existing private order lookup', /trackOrder\(normalizedOrder, checkoutPhone\)/.test(track)],
  ['recovery requires the checkout email to be supplied', /Checkout email \(for payment recovery\)/.test(track)],
  ['order email is normalized before payment initiation', /email: normalizedEmail/.test(track) && /toLowerCase\(\)/.test(track)],
  ['recovery does not require cart reconstruction', /Your order is already saved\. You do not need to rebuild your cart\./.test(track)],
  ['only unpaid non-cancelled orders expose payment recovery', /!cancelled && !\["paid", "completed", "succeeded", "success", "refunded"\]/.test(track)],
  ['payment options are loaded for order context', /CustomerPaymentMethods context="order"/.test(track)],
  ['resumption targets the persisted order id', /targetType: "order", targetId: result\.id/.test(track)],
  ['resumption uses stable per-order and per-gateway idempotency', /topline-order-payment:\$\{result\.id\}:\$\{paymentGatewayKey\}/.test(track) && /sessionStorage/.test(track)],
  ['provider checkout URL is safely navigated', /navigateToPaymentUrl\(payment\.checkout_url\)/.test(track)],
  ['non-redirect payments return through token-protected status route', /payment-return\?attempt_id=/.test(track) && /payment\.access_token/.test(track)],
  ['payment initiation server validates checkout email against stored order', fs.readFileSync(path.join(root, 'supabase/functions/payment-initiate/index.ts'), 'utf8').includes('String(order.customer_email ?? "").toLowerCase() !== email.toLowerCase()')],
  ['payment status access token remains hash-verified', /public_token_hash/.test(fs.readFileSync(path.join(root, 'supabase/functions/payment-status/index.ts'), 'utf8')) && /sha256Hex\(token\)/.test(fs.readFileSync(path.join(root, 'supabase/functions/payment-status/index.ts'), 'utf8'))],
];
const initiateSrc = fs.readFileSync(path.join(root, 'supabase/functions/payment-initiate/index.ts'), 'utf8');
checks.push(
  ['server refuses to charge an already-paid order', /payment_status === "paid"\) return reply\(409/.test(initiateSrc)],
  ['server refuses to charge a refunded order', /payment_status === "refunded"\) return reply\(409/.test(initiateSrc)],
  ['server charges only the outstanding order balance', /settledTotal/.test(initiateSrc) && /Number\(order\.total_amount\) - settledTotal/.test(initiateSrc)],
  ['server blocks a second live charge while another attempt is in flight', /already in progress/.test(initiateSrc) && /neq\("method", "bank_transfer"\)/.test(initiateSrc)],
);
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nGuest payment resume checks: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
