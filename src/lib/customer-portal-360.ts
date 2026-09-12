import { supabase } from '@/lib/supabase';

export interface CustomerPortal360Data {
  customer: { id: string; name: string; email: string; phone: string; company: string | null };
  quotations: Array<{ id: string; quotation_number: string | null; project_type: string | null; service: string | null; status: string; total_amount: number; created_at: string }>;
  orders: Array<{ id: string; order_number: string | null; status: string; total_amount: number; created_at: string; notes: string | null; items: Array<{ product_name: string; quantity: number; unit: string; unit_price: number }> }>;
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
