import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { makeStub } from './supabase-stub';

// What staff save in Admin > Site Settings must be what visitors see in the header strip, footer, WhatsApp button and SEO.
const state = { rows: [] as Array<{ setting_key: string; setting_value: unknown }> };

vi.mock('@/lib/supabase', () => {
  const client = makeStub(() => ({ data: [], error: null, count: 0 }), {
    respond: (ctx) => (ctx.kind === 'from' && ctx.name === 'site_settings' ? { data: state.rows, error: null } : undefined),
  });
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

import { mergeSiteSettingRows } from '@/lib/cms-service';
import { DEFAULT_CMS_STORE } from '@/lib/cms-defaults';

const ADMIN_CONTACT = { email: 'hello@toplinefloor.co.ke', phone: '0711 000 111', phone_alt: '', whatsapp: '+254711000111', address: 'Mombasa Rd, Nairobi' };

describe('mergeSiteSettingRows', () => {
  it('feeds the admin "contact" row into website_settings.contact (what the header strip reads)', () => {
    const store = mergeSiteSettingRows([{ setting_key: 'contact', setting_value: ADMIN_CONTACT }]);
    expect(store.website_settings.contact).toMatchObject({ email: 'hello@toplinefloor.co.ke', phone: '0711 000 111', whatsapp: '+254711000111', address: 'Mombasa Rd, Nairobi' });
    // the Contact page content group keeps its own structure
    expect(store.contact.header.title).toBe(DEFAULT_CMS_STORE.contact.header.title);
  });

  it('returns the built-in defaults when nothing has been saved', () => {
    const store = mergeSiteSettingRows([]);
    expect(store.website_settings.contact.email).toBe(DEFAULT_CMS_STORE.website_settings.contact.email);
  });

  it.each([
    ['contact first', 0],
    ['contact last', 1],
  ])('is independent of row order: a stale website_settings row never overrides the admin value (%s)', (_label, contactFirst) => {
    const stale = { setting_key: 'website_settings', setting_value: { contact: { ...DEFAULT_CMS_STORE.website_settings.contact, email: 'old@stale.example' } } };
    const contact = { setting_key: 'contact', setting_value: ADMIN_CONTACT };
    const store = mergeSiteSettingRows(contactFirst ? [contact, stale] : [stale, contact]);
    expect(store.website_settings.contact.email).toBe('hello@toplinefloor.co.ke');
  });

  it('maps social_links and business_hours, and parses JSON stored as text', () => {
    const store = mergeSiteSettingRows([
      { setting_key: 'social_links', setting_value: JSON.stringify({ facebook: 'https://facebook.com/topline', instagram: '', linkedin: '', twitter: '' }) },
      { setting_key: 'business_hours', setting_value: { weekdays: { open: '07:30', close: '19:00' }, saturday: { open: '09:00', close: '15:00' }, sunday: 'By appointment' } },
    ]);
    expect(store.website_settings.social.facebook).toBe('https://facebook.com/topline');
    expect(store.website_settings.business_hours).toMatchObject({ weekdays: { open: '07:30', close: '19:00' }, sunday: 'By appointment' });
  });

  it('ignores non-string contact fields instead of corrupting public details', () => {
    const store = mergeSiteSettingRows([{ setting_key: 'contact', setting_value: { email: 123, phone: { x: 1 } } }]);
    expect(store.website_settings.contact.email).toBe(DEFAULT_CMS_STORE.website_settings.contact.email);
    expect(store.website_settings.contact.phone).toBe(DEFAULT_CMS_STORE.website_settings.contact.phone);
  });
});

describe('public site header', () => {
  beforeEach(() => { vi.resetModules(); state.rows = []; vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows the email saved in Admin > Site Settings, not the built-in default', async () => {
    state.rows = [{ setting_key: 'contact', setting_value: ADMIN_CONTACT }];
    window.history.pushState({}, '', '/');
    const { default: App } = await import('@/App');
    render(<App />);
    await waitFor(() => {
      const links = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map((a) => a.getAttribute('href'));
      expect(links).toContain('mailto:hello@toplinefloor.co.ke');
    }, { timeout: 10000 });
    const stale = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map((a) => a.getAttribute('href'));
    expect(stale).not.toContain(`mailto:${DEFAULT_CMS_STORE.website_settings.contact.email}`);
  });
});
