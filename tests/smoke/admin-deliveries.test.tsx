import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { makeStub, type CallContext } from './supabase-stub';

// Delivery workflow: paid orders with no delivery must be startable from the UI, and dispatch needs a driver
// (the database refuses to dispatch without one, so the button is disabled instead of failing).
const RESOURCES = ['deliveries', 'orders', 'fulfillment', 'inventory', 'customers'];
const PERMISSIONS = RESOURCES.flatMap((resource) => ['select', 'insert', 'update', 'delete'].map((action) => ({ resource, action })));
const PROFILE = { user_id: 'u-admin', display_name: 'Smoke Admin', phone: null, job_title: 'Owner', is_active: true, roles: [{ code: 'owner', name: 'Owner' }] };
const ORDER = (id: string, no: string) => ({ id, order_number: no, customer_name: 'Jane Wanjiru', customer_phone: '+254712345678', total_amount: 5000, status: 'confirmed' });
const DELIVERY = { id: 'd-1', order_id: 'o-2', tracking_number: 'TRK-1', driver_name: null, assigned_driver_user_id: null, status: 'pending', scheduled_date: null, order: ORDER('o-2', 'TOP-0002') };
const state = { calls: [] as CallContext[] };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    user: { id: 'u-admin', email: 'admin@test.invalid' },
    onCall: (ctx) => { state.calls.push({ ...ctx, ops: [...ctx.ops] }); },
    rpcResult: (name) => {
      if (name === 'get_current_staff_profile') return { data: PROFILE, error: null };
      if (name === 'get_current_staff_permissions') return { data: PERMISSIONS, error: null };
      if (name === 'get_active_delivery_drivers') return { data: [{ user_id: 'drv-1', display_name: 'Peter Driver', phone: null }], error: null };
      if (name === 'mark_order_ready_for_fulfillment') return { data: { success: true }, error: null };
      return undefined;
    },
    respond: (ctx) => {
      if (ctx.kind === 'from' && ctx.name === 'deliveries') return { data: [DELIVERY], error: null };
      if (ctx.kind === 'from' && ctx.name === 'orders') return { data: [ORDER('o-1', 'TOP-0001'), ORDER('o-2', 'TOP-0002')], error: null };
      return undefined;
    },
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

describe('admin: deliveries', () => {
  beforeEach(() => {
    vi.resetModules();
    state.calls = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('lists only paid orders that have no delivery yet and lets staff mark them ready', async () => {
    window.history.pushState({}, '', '/admin/deliveries');
    const { default: App } = await import('@/App');
    render(<App />);
    expect(await screen.findByText(/Paid orders awaiting fulfilment \(1\)/, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByText('TOP-0001').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Mark ready'));
    await waitFor(() => expect(state.calls.some((c) => c.kind === 'rpc' && c.name === 'mark_order_ready_for_fulfillment' && (c.ops[0].args[0] as { p_order_id: string }).p_order_id === 'o-1')).toBe(true), { timeout: 5000 });
  });

  it('keeps Dispatch disabled until a driver is assigned', async () => {
    window.history.pushState({}, '', '/admin/deliveries');
    const { default: App } = await import('@/App');
    render(<App />);
    const dispatch = await screen.findByText('Dispatch', {}, { timeout: 10000 });
    expect((dispatch.closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
