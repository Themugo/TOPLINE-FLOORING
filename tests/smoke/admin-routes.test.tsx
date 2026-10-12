import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { makeStub, type StubResult } from './supabase-stub';

let mode: 'empty' | 'failing' = 'empty';
const RESOURCES = ['audit', 'catalog', 'content', 'customers', 'dashboard', 'finance', 'inventory', 'invoices', 'leads', 'marketing', 'media', 'orders', 'payments', 'procurement', 'projects', 'quotations', 'reports', 'settings', 'staff', 'system', 'warehouses'];
const PERMISSIONS = RESOURCES.flatMap((resource) => ['select', 'insert', 'update', 'delete'].map((action) => ({ resource, action })));
const PROFILE = { user_id: 'u-admin', display_name: 'Smoke Admin', phone: null, job_title: 'Owner', is_active: true, roles: [{ code: 'owner', name: 'Owner' }] };

const dataResult = (): StubResult =>
  mode === 'empty'
    ? { data: [], error: null, count: 0 }
    : { data: null, error: { message: 'simulated database outage', code: 'XX000' }, count: null };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => dataResult(), {
    user: { id: 'u-admin', email: 'admin@test.invalid' },
    // Identity RPCs always succeed so the guard lets the page render; everything else follows `mode`.
    rpcResult: (name) => {
      if (name === 'get_current_staff_profile') return { data: PROFILE, error: null };
      if (name === 'get_current_staff_permissions') return { data: PERMISSIONS, error: null };
      return undefined;
    },
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

// Admin pages come from the adminRoutes table in App.tsx, so a new page is covered automatically.
const app = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
const block = app.slice(app.indexOf('const adminRoutes'), app.indexOf('const AdminComponent'));
const routes = [...new Set([...block.matchAll(/'(\/admin\/[a-z0-9-]+)':/g)].map((m) => m[1]))].filter((r) => r !== '/admin/login');

describe('admin pages render for a signed-in owner without throwing', () => {
  let errors: string[] = [];
  const onWindowError = (e: ErrorEvent) => { errors.push(`window error: ${e.message}`); e.preventDefault(); };
  // A rejected promise nobody handles means a failed query left the page in an undefined state.
  const onRejection = (reason: unknown) => { errors.push(`unhandled rejection: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`); };

  beforeEach(() => {
    vi.resetModules();
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

  it('discovers the admin routes', () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  for (const m of ['empty', 'failing'] as const) {
    for (const route of routes) {
      it(`${route} (${m} data)`, async () => {
        mode = m;
        window.history.pushState({}, '', route);
        const { default: App } = await import('@/App');
        const { container } = render(<App />);
        // Wait past the guard's "checking" screen into the rendered page, then let effects and queries settle.
        await waitFor(() => expect(container.innerHTML.length).toBeGreaterThan(300), { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 200));
        expect(errors).toEqual([]);
        // The guard must have let the owner in: not redirected to login and not the access-restricted screen.
        expect(window.location.pathname).toBe(route);
        expect(container.textContent).not.toContain('Access restricted');
      });
    }
  }
});
