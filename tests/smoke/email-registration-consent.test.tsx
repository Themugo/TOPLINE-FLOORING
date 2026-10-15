import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { makeStub } from './supabase-stub';

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }));
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

describe('customer registration marketing consent', () => {
  beforeEach(() => {
    vi.resetModules();
    window.history.pushState({}, '', '/portal');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('keeps marketing consent optional and unchecked by default', async () => {
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /new customer\? create an account/i }));
    const consent = await screen.findByRole('checkbox', { name: /yes, send me occasional topline offers/i });
    expect((consent as HTMLInputElement).checked).toBe(false);
    fireEvent.click(consent);
    expect((consent as HTMLInputElement).checked).toBe(true);
    fireEvent.click(consent);
    expect((consent as HTMLInputElement).checked).toBe(false);
  });
});
