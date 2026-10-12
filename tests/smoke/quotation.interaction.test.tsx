import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import { makeStub, type CallContext, type StubResult } from './supabase-stub';

// The public quotation form: the customer must get a real reference and real failures must be visible.
const state = { rpcResult: null as StubResult | null, calls: [] as CallContext[] };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    onCall: (ctx) => { state.calls.push({ ...ctx, ops: [...ctx.ops] }); },
    respond: (ctx) => (ctx.kind === 'rpc' && ctx.name === 'submit_quotation_request' ? state.rpcResult ?? undefined : undefined),
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

async function fillAndSubmit() {
  window.history.pushState({}, '', '/quotation');
  const { default: App } = await import('@/App');
  render(<App />);
  const name = await screen.findByPlaceholderText('e.g. Architect Sarah Ochieng', {}, { timeout: 10000 });
  fireEvent.change(name, { target: { value: 'Mary Wanjiku' } });
  fireEvent.change(screen.getByPlaceholderText('sarah@firm.co.ke'), { target: { value: 'mary@example.co.ke' } });
  fireEvent.change(screen.getByPlaceholderText('+254 7XX XXX XXX'), { target: { value: '+254722000000' } });
  fireEvent.change(screen.getByPlaceholderText('e.g. 500'), { target: { value: '400' } });
  fireEvent.change(screen.getByPlaceholderText(/Tatu City/), { target: { value: 'Ruiru' } });
  fireEvent.change(screen.getByPlaceholderText(/Specify chemical exposure/), { target: { value: 'Forklift traffic, acid exposure' } });
  for (const select of Array.from(document.querySelectorAll('form select[required]')) as HTMLSelectElement[]) {
    const option = Array.from(select.options).find((o) => o.value);
    if (option) fireEvent.change(select, { target: { value: option.value } });
  }
  fireEvent.submit(document.querySelector('form') as HTMLFormElement);
}

describe('public quotation form', () => {
  beforeEach(() => {
    vi.resetModules();
    state.rpcResult = null;
    state.calls = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows a reference derived from the saved request, never an invented one', async () => {
    state.rpcResult = { data: { success: true, lead_id: 'l-1', quotation_id: 'c011b881-d9bb-4596-878f-a92dec26fd86' }, error: null };
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/Quotation Request Received!/)).toBeTruthy(), { timeout: 5000 });
    expect(document.body.textContent).toContain('RFQ-C011B881');
    const call = state.calls.find((c) => c.kind === 'rpc' && c.name === 'submit_quotation_request');
    const args = call?.ops[0].args[0] as Record<string, string>;
    expect(args).toMatchObject({ p_name: 'Mary Wanjiku', p_email: 'mary@example.co.ke', p_phone: '+254722000000' });
  });

  it('shows no reference at all when the server did not return one', async () => {
    state.rpcResult = { data: { success: true }, error: null };
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText(/Quotation Request Received!/)).toBeTruthy(), { timeout: 5000 });
    expect(document.body.textContent).not.toMatch(/RFQ-/);
  });

  it('keeps the form and reports a failed submission', async () => {
    state.rpcResult = { data: null, error: { message: 'simulated outage' } };
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText('Submission Error')).toBeTruthy(), { timeout: 5000 });
    expect(screen.queryByText(/Quotation Request Received!/)).toBeNull();
    expect((screen.getByPlaceholderText('sarah@firm.co.ke') as HTMLInputElement).value).toBe('mary@example.co.ke');
  });
});
