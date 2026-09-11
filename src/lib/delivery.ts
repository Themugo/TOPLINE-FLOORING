import { supabase } from '@/lib/supabase';

export async function createOrderDelivery(input: { orderId: string; scheduledDate?: string | null; driverName?: string | null; driverPhone?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('create_order_delivery', { p_order_id: input.orderId, p_scheduled_date: input.scheduledDate || null, p_driver_name: input.driverName || null, p_driver_phone: input.driverPhone || null, p_notes: input.notes || null });
  if (error) throw error;
  return data as { success: boolean; delivery_id: string; tracking_number: string; status: string };
}
export async function updateDelivery(input: { deliveryId: string; scheduledDate?: string | null; driverName?: string | null; driverPhone?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('update_delivery_dispatch', { p_delivery_id: input.deliveryId, p_scheduled_date: input.scheduledDate || null, p_driver_name: input.driverName || null, p_driver_phone: input.driverPhone || null, p_delivery_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function dispatchDelivery(deliveryId: string) { const { data, error } = await supabase.rpc('dispatch_order_delivery', { p_delivery_id: deliveryId }); if (error) throw error; return data; }
export async function markInTransit(deliveryId: string) { const { data, error } = await supabase.rpc('advance_delivery_in_transit', { p_delivery_id: deliveryId }); if (error) throw error; return data; }
export async function completeDelivery(input: { deliveryId: string; recipientName: string; proofUrl?: string | null; note?: string | null }) { const { data, error } = await supabase.rpc('complete_order_delivery', { p_delivery_id: input.deliveryId, p_recipient_name: input.recipientName, p_proof_of_delivery_url: input.proofUrl || null, p_proof_of_delivery_note: input.note || null }); if (error) throw error; return data; }
export async function failDelivery(deliveryId: string, reason: string) { const { data, error } = await supabase.rpc('fail_order_delivery', { p_delivery_id: deliveryId, p_reason: reason }); if (error) throw error; return data; }
export async function trackOrder(orderNumber: string, phone: string) { const { data, error } = await supabase.rpc('track_order_public', { p_order_number: orderNumber || null, p_phone: phone || null }); if (error) throw error; return data as any; }
