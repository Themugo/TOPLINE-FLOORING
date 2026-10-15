import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { makeStub } from './supabase-stub';
import { serviceTone } from '@/lib/service-tone';

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }));
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

describe('service colour coding', () => {
  it('classifies services from their own catalogue text', () => {
    expect(serviceTone('Epoxy Flooring')).toBe('flooring');
    expect(serviceTone('Waterproofing & Damp Proofing')).toBe('waterproofing');
    expect(serviceTone('Roof Repairs')).toBe('roofing');
    expect(serviceTone('Floor tile installation')).toBe('flooring'); // not mistaken for roofing
    expect(serviceTone('Consultation')).toBe('general');
  });
});

describe('design tokens', () => {
  const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
  it('keeps one palette in the Tailwind config and CSS variables', () => {
    const tw = read('tailwind.config.js');
    expect(tw).toContain("500: '#0c2d57'"); // ocean navy
    expect(tw).toContain("400: '#b4e33d'"); // signal lime
    expect(tw).toContain("500: '#0e6b78'"); // petrol
    expect(read('src/index.css')).toContain('--topline-brand-primary: #0c2d57');
  });
  it('loads the brand fonts from the app bundle instead of a third party', () => {
    const main = read('src/main.tsx');
    expect(main).toContain('@fontsource-variable/sora');
    expect(main).toContain('@fontsource-variable/manrope');
  });
});

describe('mobile action bar', () => {
  let width = 0;
  beforeEach(() => { vi.resetModules(); width = window.innerWidth; vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); void width; });

  it('offers a one-tap quotation on public pages', async () => {
    window.history.pushState({}, '', '/services');
    const { default: App } = await import('@/App');
    render(<App />);
    await waitFor(() => expect(document.querySelector('nav[aria-label="Quick actions"]')).not.toBeNull(), { timeout: 10000 });
    const quote = Array.from(document.querySelectorAll('nav[aria-label="Quick actions"] a')).find((a) => a.textContent?.includes('Get a quote'));
    expect(quote?.getAttribute('href')).toBe('/quotation');
  });

  it('stays out of the way on the cart and checkout', async () => {
    window.history.pushState({}, '', '/cart');
    const { default: App } = await import('@/App');
    render(<App />);
    await waitFor(() => expect(document.body.innerHTML.length).toBeGreaterThan(500), { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 150));
    expect(document.querySelector('nav[aria-label="Quick actions"]')).toBeNull();
  });
});
