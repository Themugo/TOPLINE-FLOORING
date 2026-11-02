export const CHECKOUT_KEY_STORAGE = 'topline-checkout-idempotency-key';
export const CHECKOUT_FINGERPRINT_STORAGE = 'topline-checkout-fingerprint';

export interface CheckoutFingerprintInput {
  lines: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  deliveryZoneId?: string | null;
  couponId?: string | null;
  email: string;
  phone: string;
  deliveryAddress?: string | null;
}

/** Stable description of exactly what is being ordered (line order does not matter). */
export function checkoutFingerprint(input: CheckoutFingerprintInput): string {
  const lines = input.lines.map((l) => [l.productId, l.variantId || null, l.quantity]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([lines, input.deliveryZoneId || null, input.couponId || null, input.email.trim().toLowerCase(), input.phone.trim(), (input.deliveryAddress || '').trim()]);
}

type KeyStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * The server replays an existing order for a repeated checkout key. That is wanted when the SAME
 * checkout is retried after a network failure, and wrong when the customer changed the order in
 * between. Reuse the key only while the fingerprint is unchanged; otherwise issue a fresh one.
 */
export function resolveCheckoutKey(currentKey: string, fingerprint: string, storage: KeyStorage, newKey: () => string = () => crypto.randomUUID()): string {
  let key = currentKey;
  try {
    const previous = storage.getItem(CHECKOUT_FINGERPRINT_STORAGE);
    if (previous && previous !== fingerprint) {
      key = newKey();
      storage.setItem(CHECKOUT_KEY_STORAGE, key);
    }
    storage.setItem(CHECKOUT_FINGERPRINT_STORAGE, fingerprint);
  } catch { /* storage unavailable: the in-memory key still applies */ }
  return key;
}
