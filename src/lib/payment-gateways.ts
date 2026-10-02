import { publicSupabase } from '@/lib/supabase';

export type CustomerPaymentContext = 'checkout' | 'order' | 'invoice';

export interface CustomerPaymentGateway {
  gateway_key: string;
  provider: string;
  payment_method: 'mpesa' | 'card' | 'bank_transfer';
  display_name: string;
  customer_description: string | null;
  icon_key: string | null;
  requires_customer_phone: boolean;
  public_config: Record<string, unknown>;
}

export async function getCustomerPaymentMethods(context: CustomerPaymentContext = 'checkout'): Promise<CustomerPaymentGateway[]> {
  const { data, error } = await publicSupabase.rpc('get_customer_payment_methods', { p_context: context });
  if (error) throw error;
  return Array.isArray(data) ? data as CustomerPaymentGateway[] : [];
}
