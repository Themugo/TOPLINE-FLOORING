import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { makeStub, type StubResult } from './supabase-stub';

let mode: 'empty' | 'failing' = 'empty';
const result = (): StubResult =>
  mode === 'empty'
    ? { data: [], error: null, count: 0 }
    : { data: null, error: { message: 'simulated database outage', code: 'XX000' }, count: null };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => result());
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

// Public routes are derived from App.tsx so a new route is covered automatically.
const app = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
const exact = [...app.matchAll(/location === '(\/[a-z0-9/-]*)'/g)].map((m) => m[1]).filter((p) => !p.startsWith('/admin'));
const prefixed = [...app.matchAll(/location\.startsWith\('(\/[a-z0-9-]+\/)'\)/g)].map((m) => `${m[1]}sample-slug`).filter((p) => !p.startsWith('/admin'));
const routes = [...new Set([...exact, ...prefixed])];

describe('public routes render without throwing', () => {
  let errors: string[] = [];
  const onWindowError = (e: ErrorEvent) => { errors.push(`window error: ${e.message}`); e.preventDefault(); };
  // A rejected promise nobody handles means a failed query left the page in an undefined state.
  const onRejection = (reason: unknown) => { errors.push(`unhandled rejection: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`); };

  beforeEach(() => {
    vi.resetModules(); // fresh module graph per route: no cached CMS/data state or timers carried between tests
    errors = [];
    window.addEventListener('error', onWindowError);
    process.on('unhandledRejection', onRejection);
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const text = args.map(String).join(' ');
      if (/The above error occurred|Uncaught|Cannot read properties|is not a function|is not defined|Minified React error/.test(text)) errors.push(text.slice(0, 300));
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    window.removeEventListener('error', onWindowError);
    process.off('unhandledRejection', onRejection);
    cleanup();
    vi.restoreAllMocks();
  });

  it('discovers the routes', () => {
    expect(routes.length).toBeGreaterThan(12);
  });

  for (const m of ['empty', 'failing'] as const) {
    for (const route of routes) {
      it(`${route} (${m} data)`, async () => {
        mode = m;
        window.history.pushState({}, '', route);
        const { default: App } = await import('@/App');
        const { container } = render(<App />);
        // Let lazy chunks, effects and the stubbed queries settle.
        await waitFor(() => expect(container.innerHTML.length).toBeGreaterThan(200), { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 150));
        expect(errors).toEqual([]);
        expect(container.querySelector('body, html')).toBeNull();
      });
    }
  }
});
