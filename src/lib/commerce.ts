import { supabase } from '@/lib/supabase';

export interface QuotationRequestInput {
  name: string;
  email: string;
  phone: string;
  county: string;
  projectType: string;
  service: string;
  message?: string;
  budgetRange?: string;
  timeline?: string;
}

export interface QuotationRequestResult {
  success: boolean;
  lead_id?: string;
  quotation_id?: string;
  error?: string;
}

export async function submitQuotationRequest(input: QuotationRequestInput): Promise<QuotationRequestResult> {
  const { data, error } = await supabase.rpc('submit_quotation_request', {
    p_name: input.name.trim(),
    p_email: input.email.trim(),
    p_phone: input.phone.trim(),
    p_county: input.county.trim(),
    p_project_type: input.projectType.trim(),
    p_service: input.service.trim(),
    p_message: input.message?.trim() || '',
    p_budget_range: input.budgetRange?.trim() || '',
    p_timeline: input.timeline?.trim() || '',
  });

  if (error) throw error;
  const result = (data ?? {}) as QuotationRequestResult;
  if (!result.success) throw new Error(result.error || 'Quotation request was not accepted');
  return result;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  code?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
}

export async function validateCoupon(code: string, orderTotal: number): Promise<CouponValidationResult> {
  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code.trim(),
    p_order_total: orderTotal,
  });
  if (error) throw error;
  return (data ?? {}) as CouponValidationResult;
}

export interface CustomerOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface CreateCustomerOrderInput {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  items: CustomerOrderItem[];
  couponId?: string | null;
  deliveryZoneId?: string | null;
  deliveryAddress?: string | null;
  paymentMethod?: 'mpesa' | 'card' | 'bank_transfer' | 'cash' | 'cheque' | 'other' | null;
  idempotencyKey?: string;
}

export interface CreateCustomerOrderResult {
  success: boolean;
  order_id?: string;
  subtotal?: number;
  delivery_charge?: number;
  discount_amount?: number;
  total?: number;
  error?: string;
}

export async function createCustomerOrder(input: CreateCustomerOrderInput): Promise<CreateCustomerOrderResult> {
  const idempotencyKey = input.idempotencyKey?.trim() || crypto.randomUUID();
  const { data, error } = await supabase.rpc('create_secure_customer_order', {
    p_name: input.name.trim(),
    p_email: input.email.trim(),
    p_phone: input.phone.trim(),
    p_items: input.items,
    p_notes: input.notes?.trim() || '',
    p_coupon_id: input.couponId || null,
    p_delivery_zone_id: input.deliveryZoneId || null,
    p_delivery_address: input.deliveryAddress?.trim() || null,
    p_payment_method: input.paymentMethod || null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;

  // The canonical Phase 2 RPC returns the authoritative order id and total.
  // Keep parsing defensive while the database migration is being deployed.
  if (typeof data === 'string') return { success: true, order_id: data };
  const result = (data ?? {}) as CreateCustomerOrderResult;
  if (!result.success) throw new Error(result.error || 'Order was not accepted');
  return result;
}
