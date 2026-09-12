import { supabase } from '@/lib/supabase';

export async function transitionPurchaseOrderLifecycle(purchaseOrderId: string, status: string, note?: string) {
  const { data, error } = await supabase.rpc('transition_purchase_order_lifecycle', {
    p_purchase_order_id: purchaseOrderId, p_status: status, p_note: note || null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function createSupplier(input: {
  name: string; contact_person?: string; email?: string; phone?: string; address?: string; notes?: string;
}) {
  const { data, error } = await supabase.rpc('create_supplier', {
    p_name: input.name, p_contact_person: input.contact_person || null, p_email: input.email || null,
    p_phone: input.phone || null, p_address: input.address || null, p_notes: input.notes || null,
  });
  if (error) throw error;
  return data as string;
}

export async function updateSupplier(id: string, input: {
  name: string; contact_person?: string; email?: string; phone?: string; address?: string; notes?: string; is_active?: boolean;
}) {
  const { data, error } = await supabase.rpc('update_supplier', {
    p_supplier_id: id, p_name: input.name, p_contact_person: input.contact_person || null,
    p_email: input.email || null, p_phone: input.phone || null, p_address: input.address || null,
    p_notes: input.notes || null, p_is_active: input.is_active ?? true,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function addPurchaseOrderItem(purchaseOrderId: string, productId: string | null, description: string, quantity: number, unitCost: number) {
  const { data, error } = await supabase.rpc('add_purchase_order_item', {
    p_purchase_order_id: purchaseOrderId, p_product_id: productId, p_description: description,
    p_quantity: quantity, p_unit_cost: unitCost,
  });
  if (error) throw error;
  return data as string;
}

export async function removePurchaseOrderItem(itemId: string) {
  const { data, error } = await supabase.rpc('remove_purchase_order_item', { p_item_id: itemId });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function reconcileInventoryProcurement() {
  const { data, error } = await supabase.rpc('reconcile_inventory_procurement');
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function getInventoryProcurementOperations360(days = 30) {
  const { data, error } = await supabase.rpc('get_inventory_procurement_operations_360', { p_days: days });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
