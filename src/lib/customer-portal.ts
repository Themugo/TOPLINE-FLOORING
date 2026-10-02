import { supabase } from '@/lib/supabase';

export interface PortalQuotation {
  id: string;
  quotation_number: string | null;
  project_type: string | null;
  service: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

export interface PortalOrder {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  items: { product_name: string; quantity: number; unit: string; unit_price: number }[];
}

export interface CustomerPortalData {
  customer: { id: string; name: string; email: string; phone: string; company: string | null };
  quotations: PortalQuotation[];
  orders: PortalOrder[];
}

export async function registerCustomerAccount(input: { name: string; email: string; phone: string; company?: string; password: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/portal`,
      data: {
        topline_customer_registration: true,
        name: input.name.trim(),
        phone: input.phone.trim(),
        company: input.company?.trim() || null,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInCustomer(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data;
}

export async function requestCustomerMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/portal` },
  });
  if (error) throw error;
}

export async function getCustomerPortalData(): Promise<CustomerPortalData> {
  const { data, error } = await supabase.rpc('get_customer_portal_data');
  if (error) throw error;
  return data as CustomerPortalData;
}

export async function signOutCustomer() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
