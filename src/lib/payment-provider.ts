import type { PaymentMethod, PaymentStatus } from './payments';

export interface ProviderPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customerPhone?: string;
  idempotencyKey: string;
}

export interface ProviderPaymentResult {
  provider: string;
  providerTransactionId: string;
  status: PaymentStatus;
  checkoutReference?: string;
  message?: string;
}

export interface ProviderWebhookEvent {
  provider: string;
  providerTransactionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: 'successful' | 'failed' | 'reversed';
  reference?: string;
  raw: unknown;
}

/**
 * Client-side code may depend on this contract, but concrete providers must
 * execute server-side. No credentials, signing keys or gateway HTTP calls
 * belong in the React bundle.
 */
export interface PaymentProviderAdapter {
  readonly name: string;
  readonly methods: readonly PaymentMethod[];
  initiate(request: ProviderPaymentRequest): Promise<ProviderPaymentResult>;
}
