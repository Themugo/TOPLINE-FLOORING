/**
 * Navigates the browser to a payment page returned by the server, but only when it is a plain https URL.
 * Anything else (javascript:, data:, http:, malformed) is refused so a bad gateway response can never
 * run script or downgrade the customer to an insecure page.
 */
export function isSafeHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function navigateToPaymentUrl(value: string): void {
  if (!isSafeHttpsUrl(value)) throw new Error('The payment page address was not secure. Your order is saved; please try again or contact us.');
  window.location.assign(value);
}
