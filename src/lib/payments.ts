/**
 * Provider-neutral payment boundary.
 *
 * The storefront must never contain provider credentials. Concrete providers
 * (M-Pesa, card gateway, bank reconciliation, etc.) should be implemented in
 * server-side Edge Functions and communicate through payment_transactions.
 */

export type PaymentMethod = 'mpesa' | 'card' | 'bank_transfer' | 'cash' | 'cheque' | 'other';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'successful'
  | 'failed'
  | 'reversed'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentTransaction {
  id: string;
  order_id: string | null;
  invoice_id: string | null;
  amount: number;
  currency: 'KES' | string;
  method: PaymentMethod;
  provider: string | null;
  provider_transaction_id: string | null;
  provider_reference: string | null;
  status: PaymentStatus;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  paid_at: string | null;
}

export interface PaymentProvider {
  readonly name: string;
  readonly methods: readonly PaymentMethod[];
}

/**
 * Providers are intentionally descriptors for now. Real credentials and
 * network calls belong in Supabase Edge Functions, not React.
 */
export const paymentProviders: PaymentProvider[] = [
  { name: 'M-Pesa', methods: ['mpesa'] },
  { name: 'Card Gateway', methods: ['card'] },
  { name: 'Bank Transfer', methods: ['bank_transfer'] },
];

export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    mpesa: 'M-Pesa',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    cheque: 'Cheque',
    other: 'Other',
  };
  return labels[method];
}
