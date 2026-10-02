import { publicSupabase } from '@/lib/supabase';

export type CustomerPaymentTarget = 'order' | 'invoice';
export type CustomerPaymentMethod = 'mpesa' | 'card' | 'bank_transfer';

export interface PaymentInitiationResult {
  success: boolean;
  attempt_id: string;
  payment_transaction_id: string;
  status: string;
  payment_method: CustomerPaymentMethod;
  amount: number;
  currency: string;
  message?: string;
  checkout_url?: string;
  instructions?: Record<string, unknown>;
  access_token: string;
  return_url?: string | null;
}

export async function initiateCustomerPayment(input: {
  targetType: CustomerPaymentTarget;
  targetId: string;
  email: string;
  phone?: string | null;
  paymentMethod: CustomerPaymentMethod;
  gatewayKey: string;
  idempotencyKey: string;
  returnUrl?: string;
}) {
  const { data, error } = await publicSupabase.functions.invoke('payment-initiate', {
    body: {
      target_type: input.targetType,
      target_id: input.targetId,
      email: input.email,
      phone: input.phone ?? null,
      payment_method: input.paymentMethod,
      gateway_key: input.gatewayKey,
      idempotency_key: input.idempotencyKey,
      return_url: input.returnUrl ?? window.location.origin + '/payment-return',
    },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Payment could not be started');
  return data as PaymentInitiationResult;
}

export async function getCustomerPaymentAttemptStatus(attemptId: string, accessToken: string) {
  const { data, error } = await publicSupabase.functions.invoke('payment-status', { body: { attempt_id: attemptId, access_token: accessToken } });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Unable to check payment status');
  return data;
}
