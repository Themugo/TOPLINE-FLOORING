import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import { makeStub } from './supabase-stub';

// Payment return page: terminal states, bank-transfer handling and the tracking link when the receipt is not in storage.
const state = { results: [] as Array<Record<string, unknown>>, calls: 0 };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }));
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});
vi.mock('@/lib/customer-payments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/customer-payments')>();
  return {
    ...actual,
    getCustomerPaymentAttemptStatus: async () => {
      const result = state.results[Math.min(state.calls, state.results.length - 1)];
      state.calls += 1;
      return result;
    },
  };
});

async function openReturnPage() {
  window.history.pushState({}, '', '/payment-return?attempt_id=att-1&access_token=tok-1');
  const { default: App } = await import('@/App');
  render(<App />);
}

describe('payment return page', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    localStorage.clear();
    state.results = [];
    state.calls = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it.each(['expired', 'cancelled', 'failed'])('shows a %s payment as not completed instead of waiting forever', async (status) => {
    state.results = [{ success: true, status, method: 'mpesa', target_type: 'order', failure_reason: 'The payment was not completed.' }];
    await openReturnPage();
    await waitFor(() => expect(screen.getByText('Payment not completed')).toBeTruthy(), { timeout: 10000 });
  });

  it('links to order tracking using the order number from the server when no receipt is stored in the browser', async () => {
    state.results = [{ success: true, status: 'successful', method: 'card', target_type: 'order', target_reference: 'TOP-2026-0042' }];
    await openReturnPage();
    const link = await screen.findByText('Track this order', {}, { timeout: 10000 });
    expect(link.closest('a')?.getAttribute('href')).toBe('/track-order?order=TOP-2026-0042');
  });

  it('does not keep polling a bank transfer that staff confirm manually', async () => {
    state.results = [{ success: true, status: 'pending', method: 'bank_transfer', target_type: 'order', instructions: {} }];
    await openReturnPage();
    await waitFor(() => expect(screen.getByText('Payment processing')).toBeTruthy(), { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 4500)); // longer than one poll interval (3.5s)
    expect(state.calls).toBe(1);
  });
});
