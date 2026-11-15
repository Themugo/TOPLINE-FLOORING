import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { makeStub } from './supabase-stub';

// Regression: InvoiceDetail referenced a `tax` variable that only existed in its parent component, so opening any
// invoice that had line items threw a ReferenceError and blanked the screen.
const RESOURCES = ['invoices', 'finance', 'orders', 'customers', 'quotations'];
const PERMISSIONS = RESOURCES.flatMap((resource) => ['select', 'insert', 'update', 'delete'].map((action) => ({ resource, action })));
const PROFILE = { user_id: 'u-admin', display_name: 'Smoke Admin', phone: null, job_title: 'Owner', is_active: true, roles: [{ code: 'owner', name: 'Owner' }] };
const INVOICE = {
  id: 'inv-1', invoice_number: 'INV-0001', customer_id: null, order_id: null, quotation_id: null,
  customer_name: 'Jane Wanjiru', customer_email: 'jane@example.co.ke', customer_phone: '+254712345678', billing_address: null,
  status: 'draft', subtotal: 1000, tax_rate: 16, tax_amount: 160, total_amount: 1160, amount_paid: 0, balance_due: 1160,
  due_date: null, notes: null, created_at: '2026-11-01T08:00:00Z', updated_at: '2026-11-01T08:00:00Z',
  items: [{ id: 'it-1', invoice_id: 'inv-1', description: 'Epoxy floor coating', quantity: 2, unit_price: 500, total_price: 1000 }],
  payments: [],
};

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    user: { id: 'u-admin', email: 'admin@test.invalid' },
    rpcResult: (name) => {
      if (name === 'get_current_staff_profile') return { data: PROFILE, error: null };
      if (name === 'get_current_staff_permissions') return { data: PERMISSIONS, error: null };
      return undefined;
    },
    respond: (ctx) => {
      if (ctx.kind === 'from' && ctx.name === 'invoices') return { data: [INVOICE], error: null, count: 1 };
      return undefined;
    },
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

describe('admin: invoice detail', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('opens an invoice that has line items without crashing', async () => {
    window.history.pushState({}, '', '/admin/invoices');
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByTitle('Open invoice', {}, { timeout: 10000 }));
    expect(await screen.findByText('Epoxy floor coating', {}, { timeout: 5000 })).toBeTruthy();
  });
});
