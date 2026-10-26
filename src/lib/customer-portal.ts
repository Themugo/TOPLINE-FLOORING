import { INITIAL_AUTH_URL_HASH } from '@/lib/auth-url';
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
  if (/same_password/i.test(code) || /different from the old password/i.test(raw)) return 'Please choose a password you have not used before.';
  if (/weak_password/i.test(code) || /password should be at least|weak/i.test(raw)) return 'That password is too weak. Use at least 8 characters.';
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

export type EmailLinkType = 'signup' | 'recovery' | 'magiclink' | 'email_change';
const EMAIL_LINK_TYPES: EmailLinkType[] = ['signup', 'recovery', 'magiclink', 'email_change'];

/**
 * Scanner-proof email links: the Supabase email templates link to /portal?token_hash=...&type=..., and the token is only
 * spent when the buyer presses the button on that page. Security tools that merely open the link cannot use it up.
 */
export function readEmailLinkToken(search: string = typeof window !== 'undefined' ? window.location.search : ''): { tokenHash: string; type: EmailLinkType } | null {
  const params = new URLSearchParams(search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailLinkType | null;
  if (!tokenHash || !type || !EMAIL_LINK_TYPES.includes(type)) return null;
  return { tokenHash, type };
}

export async function confirmEmailLink(tokenHash: string, type: EmailLinkType) {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw error;
}

/** Sends a password-reset email. The caller must show a neutral message either way so account existence is not revealed. */
export async function requestCustomerPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/portal` });
  if (error) throw error;
}

export async function updateCustomerPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

function authParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ''));
}

/** True when the page was opened from a password-recovery email link. */
export function isRecoveryLink(hash: string = INITIAL_AUTH_URL_HASH): boolean {
  return authParams(hash).get('type') === 'recovery' && !authParams(hash).get('error');
}

/** Describes a failed email link (expired, already used, invalid) so the buyer is told what to do next. */
export function readAuthLinkProblem(hash: string = INITIAL_AUTH_URL_HASH): string | null {
  const params = authParams(hash);
  const error = params.get('error');
  if (!error) return null;
  const code = params.get('error_code') ?? '';
  if (code === 'otp_expired' || error === 'access_denied') {
    return 'That email link has expired or was already used. Some email security tools open links before you do, which uses them up. Enter your email below and request a new link, or sign in if you have already verified.';
  }
  return params.get('error_description')?.replace(/\+/g, ' ') || 'That email link could not be used. Please request a new one below.';
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
