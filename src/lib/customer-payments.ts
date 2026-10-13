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

/**
 * supabase-js reports any non-2xx Edge Function response as a generic "Edge Function returned a non-2xx status
 * code". The function's own JSON body ({ success: false, error: "..." }) carries the real reason, so read it.
 */
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).clone().json() as { error?: unknown; message?: unknown };
      const text = typeof body.error === 'string' ? body.error : typeof body.message === 'string' ? body.message : '';
      if (text) return text;
    } catch {
      // body was not JSON: use the fallback
    }
  }
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message && !/non-2xx/i.test(message) ? message : fallback;
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
  if (error) throw new Error(await functionErrorMessage(error, 'Payment could not be started. Please try again.'));
  if (!data?.success) throw new Error(data?.error || 'Payment could not be started');
  return data as PaymentInitiationResult;
}

export async function getCustomerPaymentAttemptStatus(attemptId: string, accessToken: string) {
  const { data, error } = await publicSupabase.functions.invoke('payment-status', { body: { attempt_id: attemptId, access_token: accessToken } });
  if (error) throw new Error(await functionErrorMessage(error, 'Unable to check payment status'));
  if (!data?.success) throw new Error(data?.error || 'Unable to check payment status');
  return data;
}
