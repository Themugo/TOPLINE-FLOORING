import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';

const state = { mode: 'accounts' as 'accounts' | 'empty' | 'error' };
vi.mock('@/lib/supabase', () => ({ supabase: {}, publicSupabase: {}, isSupabaseConfigured: true }));
vi.mock('@/lib/payment-accounts', () => ({
  getPublicPaymentAccounts: async () => {
    if (state.mode === 'error') throw new Error('network');
    return state.mode === 'empty' ? [] : [{ id: 'a1', account_type: 'bank', display_name: 'Topline Ltd', account_name: 'Topline Ltd', account_number: '0123456789', bank_name: 'Test Bank', instructions: null, sort_order: 1 }];
  },
}));
vi.mock('@/components/payments/PaymentAccountsList', () => ({ PaymentAccountsList: ({ accounts }: { accounts: unknown[] }) => <div>accounts:{accounts.length}</div> }));

import { ManualPaymentDetails } from '@/components/payments/ManualPaymentDetails';

describe('ManualPaymentDetails', () => {
  beforeEach(() => { state.mode = 'accounts'; });
  afterEach(cleanup);

  it('shows how to pay when payment accounts exist', async () => {
    render(<ManualPaymentDetails amount={5000} reference="TOP-1" />);
    expect(await screen.findByText('How to pay')).toBeTruthy();
    expect(screen.getByText('accounts:1')).toBeTruthy();
  });

  it.each(['empty', 'error'] as const)('never leaves the customer without guidance when accounts are %s', async (mode) => {
    state.mode = mode;
    render(<ManualPaymentDetails amount={5000} reference="TOP-1" />);
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.getByText(/could not show our payment account details/i)).toBeTruthy();
    expect(screen.getByText('TOP-1')).toBeTruthy();
    expect(document.querySelector('a[href^="mailto:"]')).toBeTruthy();
  });

  it('shows nothing while the accounts are still loading', () => {
    render(<ManualPaymentDetails amount={5000} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('How to pay')).toBeNull();
  });
});
