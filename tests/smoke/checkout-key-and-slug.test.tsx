import { describe, expect, it } from 'vitest';
import { checkoutFingerprint, resolveCheckoutKey, CHECKOUT_KEY_STORAGE, CHECKOUT_FINGERPRINT_STORAGE } from '@/lib/checkout-key';
import { slugify, uniqueSlug } from '@/lib/slug';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};
const base = { lines: [{ productId: 'p1', variantId: null, quantity: 2 }, { productId: 'p2', variantId: 'v1', quantity: 1 }], deliveryZoneId: 'z1', couponId: null, email: 'A@x.co', phone: '0700', deliveryAddress: 'Main St' };

describe('checkout idempotency key', () => {
  it('keeps the key when the same checkout is retried (safe replay after a network failure)', () => {
    const storage = memoryStorage();
    const fp = checkoutFingerprint(base);
    expect(resolveCheckoutKey('key-1', fp, storage, () => 'new')).toBe('key-1'); // first attempt records fingerprint
    expect(resolveCheckoutKey('key-1', fp, storage, () => 'new')).toBe('key-1'); // retry
  });

  it('is unaffected by line order, email case and surrounding whitespace', () => {
    const reordered = { ...base, lines: [...base.lines].reverse(), email: ' a@X.co ', phone: ' 0700 ' };
    expect(checkoutFingerprint(reordered)).toBe(checkoutFingerprint(base));
  });

  it.each([
    ['quantity', { ...base, lines: [{ productId: 'p1', quantity: 3 }, base.lines[1]] }],
    ['extra item', { ...base, lines: [...base.lines, { productId: 'p3', quantity: 1 }] }],
    ['delivery zone', { ...base, deliveryZoneId: 'z2' }],
    ['coupon', { ...base, couponId: 'c1' }],
    ['phone', { ...base, phone: '0711' }],
    ['address', { ...base, deliveryAddress: 'Other Rd' }],
  ])('issues a fresh key when the %s changes, so a stale order is never replayed', (_name, changed) => {
    const storage = memoryStorage();
    resolveCheckoutKey('key-1', checkoutFingerprint(base), storage, () => 'new');
    const next = resolveCheckoutKey('key-1', checkoutFingerprint(changed), storage, () => 'key-2');
    expect(next).toBe('key-2');
    expect(storage.data.get(CHECKOUT_KEY_STORAGE)).toBe('key-2');
    expect(storage.data.get(CHECKOUT_FINGERPRINT_STORAGE)).toBe(checkoutFingerprint(changed));
  });

  it('still returns the in-memory key when storage throws (private browsing)', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(resolveCheckoutKey('key-1', 'fp', broken, () => 'new')).toBe('key-1');
  });
});

describe('slugs', () => {
  it('never produces an empty or dash-edged slug', () => {
    expect(slugify('  Warehouse Flooring!! ')).toBe('warehouse-flooring');
    expect(slugify('!!!', 'project')).toBe('project');
  });

  it('de-duplicates new records so two same-titled projects can both be saved', () => {
    expect(uniqueSlug('Warehouse Flooring', ['warehouse-flooring'])).toBe('warehouse-flooring-2');
    expect(uniqueSlug('Warehouse Flooring', ['warehouse-flooring', 'warehouse-flooring-2'])).toBe('warehouse-flooring-3');
    expect(uniqueSlug('Warehouse Flooring', [])).toBe('warehouse-flooring');
  });

  it('keeps an existing record\'s slug when its title is edited (public links do not break)', () => {
    expect(uniqueSlug('Renamed Project', ['old-slug'], 'old-slug')).toBe('old-slug');
  });
});
