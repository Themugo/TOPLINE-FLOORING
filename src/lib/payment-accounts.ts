import { publicSupabase, supabase } from '@/lib/supabase';

export type PaymentAccountKind = 'bank' | 'mpesa_paybill' | 'mpesa_till' | 'mpesa_send_money' | 'other';

export const PAYMENT_ACCOUNT_KINDS: Array<{ value: PaymentAccountKind; label: string }> = [
  { value: 'bank', label: 'Bank account' },
  { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
  { value: 'mpesa_till', label: 'M-Pesa Till (Buy Goods)' },
  { value: 'mpesa_send_money', label: 'M-Pesa Send Money' },
  { value: 'other', label: 'Other' },
];

/** What a signed-in customer (or a bank-transfer payment screen) is allowed to see. */
export interface CustomerPaymentAccount {
  id?: string;
  kind: PaymentAccountKind;
  label: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  branch: string | null;
  swift_code: string | null;
  paybill_number: string | null;
  till_number: string | null;
  phone_number: string | null;
  reference_hint: string | null;
  instructions: string | null;
}

export interface BusinessPaymentAccount extends CustomerPaymentAccount {
  id: string;
  display_order: number;
  is_active: boolean;
  show_to_customers: boolean;
}

export type PaymentAccountInput = Omit<BusinessPaymentAccount, 'id'>;

export const emptyPaymentAccount = (kind: PaymentAccountKind = 'bank'): PaymentAccountInput => ({
  kind, label: '', bank_name: null, account_name: null, account_number: null, branch: null, swift_code: null,
  paybill_number: null, till_number: null, phone_number: null, reference_hint: null, instructions: null,
  display_order: 100, is_active: true, show_to_customers: true,
});

const clean = (v: string | null | undefined) => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/** Returns an error message, or null when the account is valid. Mirrors the database CHECK constraints. */
export function validatePaymentAccount(a: PaymentAccountInput): string | null {
  if (!clean(a.label)) return 'Give this account a label customers will recognise.';
  if (a.kind === 'bank') {
    if (!clean(a.bank_name)) return 'Enter the bank name.';
    if (!clean(a.account_name)) return 'Enter the account name.';
    if (!clean(a.account_number)) return 'Enter the account number.';
  }
  if (a.account_number && !/^[0-9A-Za-z][0-9A-Za-z ./-]{2,39}$/.test(a.account_number.trim())) return 'Account number must be 3-40 letters, digits, spaces or dashes.';
  if (a.swift_code && !/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(a.swift_code.trim())) return 'SWIFT/BIC code must be 8 or 11 characters.';
  if (a.kind === 'mpesa_paybill' && !/^[0-9]{5,7}$/.test((a.paybill_number ?? '').trim())) return 'Paybill number must be 5-7 digits.';
  if (a.kind === 'mpesa_till' && !/^[0-9]{5,7}$/.test((a.till_number ?? '').trim())) return 'Till number must be 5-7 digits.';
  if (a.kind === 'mpesa_send_money' && !/^\+?[0-9][0-9 ]{7,14}$/.test((a.phone_number ?? '').trim())) return 'Enter a valid phone number for Send Money.';
  return null;
}

function toRow(a: PaymentAccountInput) {
  const isBank = a.kind === 'bank';
  return {
    kind: a.kind,
    label: a.label.trim(),
    bank_name: isBank ? clean(a.bank_name) : null,
    account_name: isBank || a.kind === 'other' ? clean(a.account_name) : clean(a.account_name),
    account_number: isBank || a.kind === 'mpesa_paybill' ? clean(a.account_number) : null,
    branch: isBank ? clean(a.branch) : null,
    swift_code: isBank ? clean(a.swift_code)?.toUpperCase() ?? null : null,
    paybill_number: a.kind === 'mpesa_paybill' ? clean(a.paybill_number) : null,
    till_number: a.kind === 'mpesa_till' ? clean(a.till_number) : null,
    phone_number: a.kind === 'mpesa_send_money' ? clean(a.phone_number) : null,
    reference_hint: clean(a.reference_hint),
    instructions: clean(a.instructions),
    display_order: Number.isFinite(a.display_order) ? Math.max(0, Math.min(10000, Math.round(a.display_order))) : 100,
    is_active: a.is_active,
    show_to_customers: a.show_to_customers,
  };
}

export async function listBusinessPaymentAccounts(): Promise<BusinessPaymentAccount[]> {
  const { data, error } = await supabase
    .from('business_payment_accounts')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BusinessPaymentAccount[];
}

export async function saveBusinessPaymentAccount(id: string | null, input: PaymentAccountInput): Promise<void> {
  const problem = validatePaymentAccount(input);
  if (problem) throw new Error(problem);
  const row = toRow(input);
  const { error } = id
    ? await supabase.from('business_payment_accounts').update(row).eq('id', id)
    : await supabase.from('business_payment_accounts').insert(row);
  if (error) throw error;
}

export async function deleteBusinessPaymentAccount(id: string): Promise<void> {
  const { error } = await supabase.from('business_payment_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function getCustomerPaymentAccounts(): Promise<CustomerPaymentAccount[]> {
  const { data, error } = await supabase.rpc('get_customer_payment_accounts');
  if (error) throw error;
  return Array.isArray(data) ? (data as CustomerPaymentAccount[]) : [];
}

/** Payment destinations marked "show to customers"; readable without signing in so guests can pay manually. */
export async function getPublicPaymentAccounts(): Promise<CustomerPaymentAccount[]> {
  const { data, error } = await publicSupabase.rpc('get_public_payment_accounts');
  if (error) throw error;
  return Array.isArray(data) ? (data as CustomerPaymentAccount[]) : [];
}
