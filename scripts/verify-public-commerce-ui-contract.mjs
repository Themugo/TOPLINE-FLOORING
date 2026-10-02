import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(message); };
const pass = (message) => console.log(`PASS ${message}`);

const data = read('src/hooks/use-data.ts');
const commerce = read('src/lib/product-commerce.ts');
const selector = read('src/components/ProductVariantSelector.tsx');
const shop = read('src/pages/shop.tsx');
const home = read('src/pages/home.tsx');
const detail = read('src/pages/shop-detail.tsx');
const cart = read('src/pages/cart.tsx');

if (!data.includes("variants:product_variants(*)")) fail('Public product listing loader does not include product variants.');
pass('Public product listing loader includes active commerce variant data.');
if (!commerce.includes('variant.is_default && variant.stock_quantity > 0') || !commerce.includes('variant.stock_quantity > 0')) fail('Default product variant selection does not prefer a purchasable option.');
pass('Default variant selection prefers an in-stock active option.');
if (!shop.includes('isProductPurchasable(product, selectedVariant)')) fail('Shop add-to-cart is not protected by shared purchasability rules.');
if (!home.includes('isProductPurchasable(product, selectedVariant)')) fail('Homepage add-to-cart is not protected by shared purchasability rules.');
if (!detail.includes('!product || !isProductPurchasable(product, selectedVariant)')) fail('Product-detail add-to-cart lacks the shared purchasability guard.');
pass('Shop, homepage and product-detail add-to-cart actions use shared purchasability rules.');
if (!selector.includes('disabled={variant.stock_quantity <= 0}')) fail('Out-of-stock variant options are not disabled.');
pass('Out-of-stock variant options remain visibly unavailable.');
if (!cart.includes('create_secure_customer_order') && !cart.includes('createCustomerOrder')) fail('Cart checkout does not use the canonical secure order path.');
if (!cart.includes('crypto.randomUUID()')) fail('Cart checkout is missing an idempotency key.');
pass('Cart checkout uses the canonical secure order path with idempotency protection.');
if (!cart.includes('validateCoupon')) fail('Cart coupon validation is missing.');
pass('Cart coupon validation remains wired to the canonical RPC wrapper.');
console.log('Public Commerce UI Contract: PASS');
