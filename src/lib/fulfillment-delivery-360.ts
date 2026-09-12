import { supabase } from '@/lib/supabase';

export async function getFulfillmentDelivery360(days = 30) {
  const { data, error } = await supabase.rpc('get_fulfillment_delivery_360', { p_days: days });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function getActiveDeliveryDrivers() {
  const { data, error } = await supabase.rpc('get_active_delivery_drivers');
  if (error) throw error;
  return (data ?? []) as Array<{ user_id: string; display_name: string; phone: string | null }>;
}

export async function checkOrderFulfillmentReadiness(orderId: string) {
  const { data, error } = await supabase.rpc('check_order_fulfillment_readiness', { p_order_id: orderId });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function markOrderReadyForFulfillment(orderId: string) {
  const { data, error } = await supabase.rpc('mark_order_ready_for_fulfillment', { p_order_id: orderId });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function assignDeliveryDriver(deliveryId: string, driverUserId: string) {
  const { data, error } = await supabase.rpc('assign_delivery_driver', { p_delivery_id: deliveryId, p_driver_user_id: driverUserId });
  if (error) throw error;
  return data;
}

export async function markDeliveryPicked(deliveryId: string) {
  const { data, error } = await supabase.rpc('mark_delivery_picked', { p_delivery_id: deliveryId });
  if (error) throw error;
  return data;
}

export async function rescheduleDelivery(deliveryId: string, scheduledDate: string, note?: string) {
  const { data, error } = await supabase.rpc('reschedule_order_delivery', { p_delivery_id: deliveryId, p_scheduled_date: scheduledDate, p_note: note || null });
  if (error) throw error;
  return data;
}

export async function recordDeliveryException(deliveryId: string, reason: string) {
  const { data, error } = await supabase.rpc('record_delivery_exception', { p_delivery_id: deliveryId, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function recoverFailedDelivery(deliveryId: string, scheduledDate?: string, note?: string) {
  const { data, error } = await supabase.rpc('recover_failed_delivery', { p_delivery_id: deliveryId, p_scheduled_date: scheduledDate || null, p_note: note || null });
  if (error) throw error;
  return data;
}
