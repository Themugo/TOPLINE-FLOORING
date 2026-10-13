import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import { makeStub, type CallContext } from './supabase-stub';

// Guest checkout: server-side pricing, idempotency, payment start, and honest failure messages.
const PRODUCT = { id: 'p-1', name: 'Epoxy Kit', slug: 'epoxy-kit', price: 2500, sale_price: null, unit: 'unit', image_url: '', in_stock: true, stock_quantity: 50, is_active: true, category_id: null, brand_id: null, description: '', short_description: '', sku: 'EK1', featured: false, display_order: 0 };
const GATEWAYS = [{ gateway_key: 'mpesa-main', provider: 'mpesa', payment_method: 'mpesa', display_name: 'M-Pesa', customer_description: null, icon_key: null, requires_customer_phone: true, public_config: {} }];

const state = {
  invokeResult: null as { data: unknown; error: unknown } | null,
  calls: [] as CallContext[],
  invoked: [] as Array<{ name: string; body: unknown }>,
};

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    onCall: (ctx) => { state.calls.push({ ...ctx, ops: [...ctx.ops] }); },
    rpcResult: (name) => {
      if (name === 'get_customer_payment_methods') return { data: GATEWAYS, error: null };
      if (name === 'create_secure_customer_order') return { data: { success: true, order_id: 'o-1', order_number: 'TOP-TEST-0001', subtotal: 5000, total: 5000 }, error: null };
      return undefined;
    },
  });
  (client.functions as { invoke: unknown }).invoke = async (name: string, options: { body: unknown }) => {
    state.invoked.push({ name, body: options?.body });
    return state.invokeResult ?? { data: { success: true, attempt_id: 'att-1', access_token: 'tok-1', payment_transaction_id: 'tx-1', status: 'pending', payment_method: 'mpesa', amount: 5000, currency: 'KES', message: 'Check your phone' }, error: null };
  };
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

const orderArgs = () => state.calls.find((c) => c.kind === 'rpc' && c.name === 'create_secure_customer_order')?.ops[0].args[0] as Record<string, unknown> | undefined;

async function checkout() {
  localStorage.setItem('flooring_app_cart', JSON.stringify([{ product: PRODUCT, quantity: 2 }]));
  window.history.pushState({}, '', '/cart');
  const { default: App } = await import('@/App');
  render(<App />);
  const name = await screen.findByPlaceholderText('John Doe', {}, { timeout: 10000 });
  fireEvent.change(name, { target: { value: 'Jane Wanjiru' } });
  fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'jane@example.co.ke' } });
  fireEvent.change(screen.getByPlaceholderText('+254 7XX XXX XXX'), { target: { value: '+254712345678' } });
  // wait for the payment method to be auto-selected
  await waitFor(() => expect(screen.getByText('M-Pesa')).toBeTruthy(), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 100));
  fireEvent.submit(document.querySelector('form') as HTMLFormElement);
}

describe('guest checkout', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    state.invokeResult = null;
    state.calls = [];
    state.invoked = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('sends product ids and quantities only (the server prices the order), starts payment and clears the cart', async () => {
    await checkout();
    await waitFor(() => expect(state.invoked.length).toBe(1), { timeout: 8000 });
    const args = orderArgs()!;
    const items = args.p_items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ product_id: 'p-1', quantity: 2 });
    expect(JSON.stringify(args)).not.toMatch(/"price"|unit_price|total/); // no client-side money fields
    expect(typeof args.p_idempotency_key).toBe('string');
    expect((args.p_idempotency_key as string).length).toBeGreaterThan(8);
    expect(state.invoked[0].name).toBe('payment-initiate');
    expect(state.invoked[0].body).toMatchObject({ target_type: 'order', target_id: 'o-1', payment_method: 'mpesa', gateway_key: 'mpesa-main' });
    await waitFor(() => expect(window.location.pathname).toBe('/payment-return'));
    expect(JSON.parse(localStorage.getItem('flooring_app_cart') || '[]')).toEqual([]);
  });

  it('shows the payment function\'s real reason when payment cannot start, and keeps the cart', async () => {
    const response = new Response(JSON.stringify({ success: false, error: 'M-Pesa callback URL must include ?secret= matching MPESA_CALLBACK_SECRET' }), { status: 400 });
    state.invokeResult = { data: null, error: { message: 'Edge Function returned a non-2xx status code', context: response } };
    await checkout();
    await waitFor(() => expect(screen.getByText('Order Failed')).toBeTruthy(), { timeout: 8000 });
    expect(screen.getByText(/MPESA_CALLBACK_SECRET/)).toBeTruthy();
    expect(screen.queryByText(/non-2xx/)).toBeNull();
    expect(window.location.pathname).toBe('/cart');
    expect(JSON.parse(localStorage.getItem('flooring_app_cart') || '[]')).toHaveLength(1);
  });
});
