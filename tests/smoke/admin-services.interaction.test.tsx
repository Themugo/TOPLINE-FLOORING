import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import { makeStub, type CallContext, type StubResult } from './supabase-stub';

// Drives the real admin "Add service" form end to end against a stubbed Supabase.
// This is the flow that used to hang with no feedback: saving, upload and error reporting.

const PERMISSIONS = ['content', 'media', 'catalog'].flatMap((resource) => ['select', 'insert', 'update', 'delete'].map((action) => ({ resource, action })));
const PROFILE = { user_id: 'u-admin', display_name: 'Smoke Admin', phone: null, job_title: 'Owner', is_active: true, roles: [{ code: 'owner', name: 'Owner' }] };

const state = {
  existingServices: [] as Array<Record<string, unknown>>,
  insertResult: null as StubResult | null,
  uploadResult: null as StubResult | null,
  calls: [] as CallContext[],
};

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    user: { id: 'u-admin', email: 'admin@test.invalid' },
    rpcResult: (name) => {
      if (name === 'get_current_staff_profile') return { data: PROFILE, error: null };
      if (name === 'get_current_staff_permissions') return { data: PERMISSIONS, error: null };
      return undefined;
    },
    onCall: (ctx) => { state.calls.push({ ...ctx, ops: [...ctx.ops] }); },
    respond: (ctx) => {
      if (ctx.kind === 'storage') return state.uploadResult ?? { data: { path: 'ok' }, error: null };
      if (ctx.kind === 'from' && ctx.name === 'services') {
        if (ctx.ops.some((o) => o.method === 'insert')) return state.insertResult ?? { data: { id: 'new-1' }, error: null };
        return { data: state.existingServices, error: null };
      }
      return undefined;
    },
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

async function openForm() {
  window.history.pushState({}, '', '/admin/services');
  const { default: App } = await import('@/App');
  render(<App />);
  const add = await screen.findByText(/Add service|Add your first service/i, {}, { timeout: 10000 });
  fireEvent.click(add);
  return screen.findByPlaceholderText('Service name');
}

const submitButton = () => document.querySelector('form button[type="submit"]') as HTMLButtonElement;

const insertCall = () => state.calls.find((c) => c.kind === 'from' && c.name === 'services' && c.ops.some((o) => o.method === 'insert'));
const insertedPayload = () => (insertCall()?.ops.find((o) => o.method === 'insert')?.args[0] ?? null) as Record<string, unknown> | null;

describe('admin: add service', () => {
  beforeEach(() => {
    vi.resetModules();
    state.existingServices = [];
    state.insertResult = null;
    state.uploadResult = null;
    state.calls = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('saves a new service, shows confirmation and closes the form', async () => {
    const name = await openForm();
    fireEvent.change(name, { target: { value: 'Epoxy Flooring' } });
    fireEvent.change(screen.getByPlaceholderText('Full description'), { target: { value: 'Seamless resin floors' } });
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getByText('Service added')).toBeTruthy(), { timeout: 5000 });
    const p = insertedPayload();
    expect(p).not.toBeNull();
    expect(p).toMatchObject({ name: 'Epoxy Flooring', slug: 'epoxy-flooring', is_active: true });
    expect(Array.isArray(p!.features)).toBe(true);
    expect(JSON.stringify(p)).not.toContain('data:image'); // never embeds image bytes in the row
    await waitFor(() => expect(screen.queryByPlaceholderText('Service name')).toBeNull());
  });

  it('gives a duplicate name its own unique slug instead of failing', async () => {
    state.existingServices = [{ id: 's1', name: 'Epoxy Flooring', slug: 'epoxy-flooring', description: 'x', is_active: true, display_order: 0, features: [] }];
    const name = await openForm();
    fireEvent.change(name, { target: { value: 'Epoxy Flooring' } });
    fireEvent.change(screen.getByPlaceholderText('Full description'), { target: { value: 'Another one' } });
    fireEvent.click(submitButton());
    await waitFor(() => expect(insertedPayload()).not.toBeNull(), { timeout: 5000 });
    expect(insertedPayload()!.slug).toBe('epoxy-flooring-2');
  });

  it('reports a permission failure with the real reason and does not hang', async () => {
    state.insertResult = { data: null, error: { message: 'new row violates row-level security policy for table "services"', code: '42501' } };
    const name = await openForm();
    fireEvent.change(name, { target: { value: 'Waterproofing' } });
    fireEvent.change(screen.getByPlaceholderText('Full description'), { target: { value: 'Membranes' } });
    const submit = submitButton();
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByText('Failed to save service')).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText(/do not have permission/i)).toBeTruthy();
    // The form stays open with the data intact and the button is usable again (not stuck on "saving").
    expect((screen.getByPlaceholderText('Service name') as HTMLInputElement).value).toBe('Waterproofing');
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
  });

  it('shows a clear error when the image upload is rejected and never stores base64', async () => {
    state.uploadResult = { data: null, error: { message: 'mime type image/svg+xml is not supported' } };
    const name = await openForm();
    fireEvent.change(name, { target: { value: 'Roofing' } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/not accepted by storage|Upload failed/i)).toBeTruthy(), { timeout: 5000 });
    expect(document.body.innerHTML).not.toContain('data:image');
  });
});
