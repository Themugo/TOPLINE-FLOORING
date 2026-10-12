import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import { makeStub, type CallContext, type StubResult } from './supabase-stub';

// Editing a product used to erase its brand (the update RPC overwrites brand_id and the form never sent one).
const PERMISSIONS = ['catalog', 'media', 'content', 'inventory'].flatMap((resource) => ['select', 'insert', 'update', 'delete'].map((action) => ({ resource, action })));
const PROFILE = { user_id: 'u-admin', display_name: 'Smoke Admin', phone: null, job_title: 'Owner', is_active: true, roles: [{ code: 'owner', name: 'Owner' }] };
const PRODUCT = { id: 'p-1', name: 'Primer', slug: 'primer', category_id: null, brand_id: 'b-sika', description: 'd', short_description: 's', sku: 'SKU1', price: 100, unit: 'bucket', image_url: '', featured: false, in_stock: true, is_active: true, display_order: 0, created_at: '2026-01-01', updated_at: '2026-01-01', category: null, brand: { id: 'b-sika', name: 'Sika' } };
const BRANDS = [{ id: 'b-sika', name: 'Sika', slug: 'sika', is_active: true }, { id: 'b-other', name: 'Other', slug: 'other', is_active: true }];
const state = { rpcFail: null as StubResult | null, calls: [] as CallContext[] };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    user: { id: 'u-admin', email: 'admin@test.invalid' },
    rpcResult: (name) => {
      if (name === 'get_current_staff_profile') return { data: PROFILE, error: null };
      if (name === 'get_current_staff_permissions') return { data: PERMISSIONS, error: null };
      if (name === 'update_product_admin' || name === 'create_product_admin') return state.rpcFail ?? { data: { id: 'p-1' }, error: null };
      return undefined;
    },
    onCall: (ctx) => { state.calls.push({ ...ctx, ops: [...ctx.ops] }); },
    respond: (ctx) => {
      if (ctx.kind === 'from' && ctx.name === 'products') return { data: [PRODUCT], error: null, count: 1 };
      if (ctx.kind === 'from' && ctx.name === 'product_brands') return { data: BRANDS, error: null };
      return undefined;
    },
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

const rpcArgs = (name: string) => state.calls.find((c) => c.kind === 'rpc' && c.name === name)?.ops[0].args[0] as Record<string, unknown> | undefined;

async function openEditor() {
  window.history.pushState({}, '', '/admin/products');
  const { default: App } = await import('@/App');
  render(<App />);
  const edit = await screen.findByTitle('Edit product', {}, { timeout: 10000 });
  fireEvent.click(edit);
  await screen.findByPlaceholderText('One line shown on product cards');
}
const submit = () => fireEvent.submit(document.querySelector('form') as HTMLFormElement);

describe('admin: edit product', () => {
  beforeEach(() => {
    vi.resetModules();
    state.rpcFail = null;
    state.calls = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('preloads the brand and sends it unchanged, so an edit never erases it', async () => {
    await openEditor();
    const brandSelect = Array.from(document.querySelectorAll('select')).find((s) => Array.from(s.options).some((o) => o.text === 'Sika')) as HTMLSelectElement;
    expect(brandSelect).toBeDefined();
    expect(brandSelect.value).toBe('b-sika');
    submit();
    await waitFor(() => expect(rpcArgs('update_product_admin')).toBeDefined(), { timeout: 5000 });
    expect(rpcArgs('update_product_admin')).toMatchObject({ p_product_id: 'p-1', p_brand_id: 'b-sika' });
  });

  it('explains a refused update in plain words instead of failing silently', async () => {
    state.rpcFail = { data: null, error: { message: 'Permission denied: catalog.update', code: 'P0001' } };
    await openEditor();
    submit();
    await waitFor(() => expect(screen.getByText('Could not save product')).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText(/do not have permission/i)).toBeTruthy();
  });
});
