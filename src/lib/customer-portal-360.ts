import { supabase } from '@/lib/supabase';

export interface CustomerPortal360Data {
  customer: { id: string; name: string; email: string; phone: string; company: string | null };
  quotations: Array<{ id: string; quotation_number: string | null; project_type: string | null; service: string | null; status: string; total_amount: number; created_at: string; items: Array<{ description: string; quantity: number; unit: string; unit_price: number; line_total: number }> }>;
  orders: Array<{ id: string; order_number: string | null; status: string; total_amount: number; created_at: string; notes: string | null; payment_status?: string | null; payment_method?: string | null; customer_phone?: string | null; items: Array<{ product_name: string; quantity: number; unit: string; unit_price: number }> }>;
  projects: Array<{ id: string; project_number: string | null; title: string; project_type: string | null; service_type: string | null; location: string | null; status: string; progress_percentage: number; progress_notes: string | null; start_date: string | null; end_date: string | null; completion_date: string | null; project_value: number | null; description: string | null; completion_notes: string | null }>;
  invoices: Array<{ id: string; invoice_number: string | null; status: string; subtotal: number; tax_amount: number; total_amount: number; amount_paid: number; due_date: string | null; pdf_url: string | null; created_at: string; notes: string | null; items: Array<{ description: string; quantity: number; unit_price: number; line_total: number }> }>;
  service_cases: Array<{ id: string; case_number: string; type: string; status: string; priority: string; issue_title: string; description: string; reported_at: string; scheduled_date: string | null; resolution: string | null; resolved_at: string | null; project_id: string | null; order_id: string | null }>;
  site_visits: Array<{ id: string; scheduled_date: string | null; scheduled_time: string | null; visit_type: string | null; status: string; visit_notes: string | null; project_id: string | null; quotation_id: string | null }>;
  installations: Array<{ id: string; installation_number: string | null; scheduled_date: string | null; scheduled_time: string | null; status: string; notes: string | null; progress_photos: string[] | null; customer_confirmation: boolean; completion_certificate: string | null; project_id: string | null; order_id: string | null }>;
  summary: { active_projects: number; open_orders: number; outstanding_invoices: number; open_service_cases: number };
}

export async function getCustomerPortal360(): Promise<CustomerPortal360Data> {
  const { data, error } = await supabase.rpc('get_customer_portal_360');
  if (error) throw error;
  return data as CustomerPortal360Data;
}

export type PortalClaimStatus = 'already_linked' | 'linked' | 'created' | 'unverified' | 'ambiguous' | 'conflict' | 'unauthenticated';

export async function claimCustomerPortalAccess(): Promise<PortalClaimStatus> {
  const { data, error } = await supabase.rpc('claim_customer_portal_access');
  if (error) throw error;
  return ((data as { status?: PortalClaimStatus } | null)?.status ?? 'unauthenticated');
}

export function isPortalAccessMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : '';
  return /portal access is not available/i.test(msg);
}

export interface QuotationResponseResult { id: string; status: string; order_id?: string | null; project_id?: string | null; conversion_note?: string | null }

export type QuotationResponseAction = 'accept' | 'decline' | 'request_changes';

/** Statuses in which the customer may still answer a quotation (mirrors the server rule). */
export const QUOTATION_OPEN_STATUSES = ['quoted', 'sent', 'negotiating'];

export async function respondToCustomerQuotation(quotationId: string, action: QuotationResponseAction, note?: string): Promise<QuotationResponseResult> {
  const { data, error } = await supabase.rpc('respond_to_customer_quotation', { p_quotation_id: quotationId, p_action: action, p_note: note?.trim() || null });
  if (error) throw error;
  return data as QuotationResponseResult;
}
