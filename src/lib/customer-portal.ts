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

export async function registerCustomerAccount(input: { name: string; email: string; phone: string; company?: string; password: string; marketingEmailOptIn?: boolean }) {
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
        marketing_email_opt_in: input.marketingEmailOptIn === true,
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

/** Sends the sign-up confirmation email again (Supabase enforces its own minimum interval between sends). */
export async function resendCustomerVerification(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/portal` },
  });
  if (error) throw error;
}

/** Plain-English messages for the authentication errors customers actually hit. */
export function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
  if (/not confirmed/i.test(raw) || code === 'email_not_confirmed') return 'Your email address has not been verified yet. Open the verification link we emailed you, or resend it below.';
  if (/rate limit|too many|over_email_send_rate_limit|for security purposes/i.test(raw) || /rate_limit/i.test(code)) return 'Too many emails were requested. Please wait a minute and try again.';
  if (/invalid login credentials/i.test(raw)) return 'The email or password is incorrect.';
  return raw || 'Unable to complete your request.';
}

export function isUnverifiedEmailError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : '';
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
  return /not confirmed/i.test(raw) || code === 'email_not_confirmed';
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
