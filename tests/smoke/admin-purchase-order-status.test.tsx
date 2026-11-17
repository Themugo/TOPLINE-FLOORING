import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { makeStub } from './supabase-stub';

// Regression: changing a purchase order's status through the dropdown threw an unhandled error when the database refused
// it (for example "must contain at least one line item"), so the select silently snapped back and staff saw nothing.
const RESOURCES = ['procurement', 'inventory', 'products', 'suppliers'];
const PERMISSIONS = RESOURCES.flatMap((resource) => ['select', 'insert', 'update', 'delete'].map((action) => ({ resource, action })));
const PROFILE = { user_id: 'u-admin', display_name: 'Smoke Admin', phone: null, job_title: 'Owner', is_active: true, roles: [{ code: 'owner', name: 'Owner' }] };
const PO = { id: 'po-1', po_number: 'PO-0001', supplier_id: 's-1', status: 'draft', expected_date: null, created_at: '2026-11-01T08:00:00Z', supplier: { id: 's-1', name: 'Acme Tiles' }, items: [] };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    user: { id: 'u-admin', email: 'admin@test.invalid' },
    rpcResult: (name) => {
      if (name === 'get_current_staff_profile') return { data: PROFILE, error: null };
      if (name === 'get_current_staff_permissions') return { data: PERMISSIONS, error: null };
      if (name === 'transition_purchase_order_lifecycle') return { data: null, error: { message: 'Purchase order must contain at least one line item', code: 'P0001' } };
      return undefined;
    },
    respond: (ctx) => (ctx.kind === 'from' && ctx.name === 'purchase_orders' ? { data: [PO], error: null } : undefined),
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

describe('admin: purchase order status', () => {
  beforeEach(() => { vi.resetModules(); vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('tells staff why a status change was refused', async () => {
    window.history.pushState({}, '', '/admin/suppliers');
    const { default: App } = await import('@/App');
    render(<App />);
    const select = await screen.findByLabelText('Purchase order PO-0001 status', {}, { timeout: 10000 });
    fireEvent.change(select, { target: { value: 'sent' } });
    await waitFor(() => expect(screen.getByText('Status not changed')).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText('Purchase order must contain at least one line item')).toBeTruthy();
  });
});
