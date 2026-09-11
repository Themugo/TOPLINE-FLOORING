import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/lib/types';

export interface Order360Payment { id: string; amount: number; currency: string; method: string; provider: string | null; provider_transaction_id: string | null; provider_reference: string | null; status: string; failure_reason: string | null; paid_at: string | null; created_at: string; }
export interface Order360Refund { id: string; payment_transaction_id: string; amount: number; status: string; provider: string | null; provider_refund_id: string | null; reason: string | null; processed_at: string | null; created_at: string; }
export interface Order360Delivery { id: string; order_id: string; tracking_number: string | null; status: string; scheduled_date: string | null; dispatched_at: string | null; delivered_at: string | null; driver_name: string | null; delivery_address: string | null; proof_of_delivery_note: string | null; created_at: string; }
export interface Order360Reservation { id: string; order_id: string; product_id: string; variant_id: string | null; quantity: number; status: string; expires_at: string | null; released_at: string | null; created_at: string; }
export interface OrderOperations360 { order: Order; items: OrderItem[]; deliveries: Order360Delivery[]; reservations: Order360Reservation[]; finance_access: boolean; inventory_access: boolean; paid_amount: number; refunded_amount: number; outstanding_amount: number; payments: Order360Payment[]; refunds: Order360Refund[]; retrieved_at: string; }

export async function getOrderOperations360(orderId: string): Promise<OrderOperations360> {
  const { data, error } = await supabase.rpc('get_order_operations_360', { p_order_id: orderId });
  if (error) throw error;
  return data as unknown as OrderOperations360;
}

export async function reconcileOrderPayment(orderId: string): Promise<number> {
  const { data, error } = await supabase.rpc('reconcile_order_payment_totals', { p_order_id: orderId });
  if (error) throw error;
  return Number(data ?? 0);
}
