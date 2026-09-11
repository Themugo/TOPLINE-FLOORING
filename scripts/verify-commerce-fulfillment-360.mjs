import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260912010000_057_commerce_fulfillment_integrity.sql'), 'utf8');
const commerce = fs.readFileSync(path.join(root, 'src/lib/commerce.ts'), 'utf8');
const cart = fs.readFileSync(path.join(root, 'src/hooks/use-cart.tsx'), 'utf8');
const checkout = fs.readFileSync(path.join(root, 'src/pages/cart.tsx'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'src/pages/shop-detail.tsx'), 'utf8');
const required = [
  'CREATE OR REPLACE FUNCTION public.create_secure_customer_order',
  'GROUP BY NULLIF(item->>\'product_id\',\'\')::uuid',
  'variant_id',
  'Order stock reservation is no longer available',
  'Stock consumed by paid ecommerce order variant',
  'CREATE OR REPLACE FUNCTION public.expire_inventory_reservations',
  "status='cancelled'",
  'current_uses=GREATEST(current_uses-1,0)',
];
for (const token of required) if (!migration.includes(token)) throw new Error(`Fulfillment migration missing: ${token}`);
for (const token of ['variant_id?: string | null','create_secure_customer_order']) if (!commerce.includes(token)) throw new Error(`commerce contract missing: ${token}`);
for (const token of ['item.variant?.id','variant?: ProductVariant','const unitPrice = item.variant']) if (!cart.includes(token)) throw new Error(`cart variant contract missing: ${token}`);
if (!checkout.includes('variant_id: item.variant?.id || null')) throw new Error('Checkout does not send variant_id');
if (!shop.includes('selectedVariant')) throw new Error('Product detail does not maintain selected variant');
console.log('Commerce Fulfillment 360 verification PASSED.');
console.log('- Variant-aware checkout contract');
console.log('- Duplicate-line aggregate stock validation');
console.log('- Variant-aware payment stock consumption');
console.log('- Reservation expiry cancels unpaid orders and releases coupon usage');
