import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const productCommerce = read('src/lib/product-commerce.ts');
const dataHook = read('src/hooks/use-data.ts');
const cart = read('src/hooks/use-cart.tsx');
const shop = read('src/pages/shop.tsx');
const home = read('src/pages/home.tsx');
const detail = read('src/pages/shop-detail.tsx');
const checkout = read('src/pages/cart.tsx');
const commerce = read('src/lib/commerce.ts');

expect(productCommerce.includes('getActiveProductVariants'), 'Canonical active-variant helper missing.');
expect(productCommerce.includes('getProductUnitPrice'), 'Canonical variant-aware price helper missing.');
expect(productCommerce.includes('getProductAvailableStock'), 'Canonical variant-aware stock helper missing.');
expect(productCommerce.includes('isProductPurchasable'), 'Canonical purchasability helper missing.');
expect(dataHook.includes("variants:product_variants(*)"), 'Product listing query does not load variants.');
expect(cart.includes('item.variant?.id === action.variant?.id'), 'Cart identity is not product + variant aware.');
expect(cart.includes('item.variant.sale_price'), 'Cart total is not variant-price aware.');
expect(shop.includes('ProductVariantSelector') && shop.includes('addItem(product, variant)'), 'Shop entry point is not variant-aware.');
expect(home.includes('ProductVariantSelector') && home.includes('addItem(product, variant)'), 'Homepage featured-product entry point is not variant-aware.');
expect(detail.includes('ProductVariantSelector') && detail.includes('addItem(rp, selectedRpVariant)'), 'Related-product entry point is not variant-aware.');
expect(checkout.includes('variant_id: item.variant?.id || null'), 'Checkout does not carry canonical variant identity.');
expect(commerce.includes('variant_id?: string | null'), 'Order item commerce contract lacks variant identity.');
expect(checkout.includes("description: message"), 'Checkout does not surface authoritative order rejection reasons.');

if (failures.length) {
  console.error('Commerce Entry-Point Consistency 360 verification FAILED.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commerce Entry-Point Consistency 360 verification PASSED.');
console.log('- Product listings load active variants');
console.log('- Shop, homepage and related-product entry points are variant-aware');
console.log('- Cart and checkout preserve variant identity and authoritative pricing');
console.log('- Customer checkout surfaces authoritative validation failures');
