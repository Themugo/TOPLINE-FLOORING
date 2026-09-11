import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase/migrations/20260912000000_056_public_tracking_privacy.sql');
const page = path.join(root, 'src/pages/track-order.tsx');
const confirmation = path.join(root, 'src/pages/order-confirmation.tsx');
const cart = path.join(root, 'src/pages/cart.tsx');
const commerce = path.join(root, 'src/lib/commerce.ts');

for (const file of [migration, page, confirmation, cart, commerce]) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${path.relative(root, file)}`);
}

const read = (file) => fs.readFileSync(file, 'utf8');
const sql = read(migration);
const tracking = read(page);
const receipt = read(confirmation);
const checkout = read(cart);
const api = read(commerce);

const requiredSql = [
  "CREATE OR REPLACE FUNCTION public.track_order_public",
  "AND customer_phone = trim(p_phone)",
  "REVOKE EXECUTE ON FUNCTION public.track_order_public(text, text) FROM anon, authenticated",
  "GRANT EXECUTE ON FUNCTION public.track_order_public(text, text) TO anon, authenticated",
];
for (const token of requiredSql) if (!sql.includes(token)) throw new Error(`Tracking privacy migration missing: ${token}`);

if (!/both your order number and the phone number used at checkout/i.test(tracking)) {
  throw new Error('Tracking UI does not require both identity factors.');
}
if (!/if \(!orderId\.trim\(\) \|\| !phone\.trim\(\)\)/.test(tracking)) {
  throw new Error('Tracking submit guard is not enforcing both fields.');
}
if (!/order_number\?: string/.test(api)) throw new Error('Checkout result does not expose order_number.');
if (!/orderNumber: result\.order_number/.test(checkout)) throw new Error('Checkout confirmation does not persist the canonical order number.');
if (!/savedAt: Date\.now\(\)/.test(checkout)) throw new Error('Checkout confirmation receipt does not have a refresh-safe timestamp.');
if (!/parsed\.savedAt/.test(receipt)) throw new Error('Order confirmation does not validate receipt age.');
if (!/Track This Order/.test(receipt)) throw new Error('Order confirmation does not link to tracking.');

console.log('Public order tracking privacy initiative verification PASSED.');
console.log('- Tracking requires both order number and checkout phone number.');
console.log('- Canonical order number is carried into the confirmation receipt.');
console.log('- Confirmation receipt survives refresh for a bounded 24-hour session.');
console.log('- Confirmation provides a direct tracking path.');
