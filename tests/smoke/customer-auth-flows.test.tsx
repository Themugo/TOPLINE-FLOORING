import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeStub } from './supabase-stub';
import { friendlyAuthError, isUnverifiedEmailError } from '@/lib/customer-portal';

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  resend: vi.fn(),
};

vi.mock('@/lib/supabase', () => {
  const base = makeStub(() => ({ data: [], error: null, count: 0 }));
  const client = { ...base, auth: { ...base.auth, signUp: (...a: unknown[]) => auth.signUp(...a), signInWithPassword: (...a: unknown[]) => auth.signInWithPassword(...a), signInWithOtp: (...a: unknown[]) => auth.signInWithOtp(...a), resend: (...a: unknown[]) => auth.resend(...a) } };
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('customer authentication messages', () => {
  it('explains an unverified email in plain English', () => {
    const err = Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed' });
    expect(isUnverifiedEmailError(err)).toBe(true);
    expect(friendlyAuthError(err)).toMatch(/has not been verified/i);
  });
  it('explains an email rate limit and bad credentials', () => {
    expect(friendlyAuthError(new Error('email rate limit exceeded'))).toMatch(/wait a minute/i);
    expect(friendlyAuthError(new Error('For security purposes, you can only request this after 52 seconds.'))).toMatch(/wait a minute/i);
    expect(friendlyAuthError(new Error('Invalid login credentials'))).toBe('The email or password is incorrect.');
    expect(isUnverifiedEmailError(new Error('Invalid login credentials'))).toBe(false);
  });
});

describe('customer registration and verification journey', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(auth).forEach((f) => f.mockReset());
    window.history.pushState({}, '', '/portal');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('registers with the consent flag and lets the customer resend the verification email', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'u1', identities: [{}] }, session: null }, error: null });
    auth.resend.mockResolvedValue({ data: {}, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /new customer\? create an account/i }));
    fill(/full name/i, 'Amina Wanjiru');
    fill(/^email/i, 'Amina@Example.org');
    fill(/phone/i, '0712345678');
    fill(/^password/i, 'correct horse 9');
    fireEvent.click(await screen.findByRole('checkbox', { name: /yes, send me occasional topline offers/i }));
    fireEvent.click(screen.getByRole('button', { name: /create (customer )?account|register|sign up/i }));

    await screen.findByText(/check your email to finish registration/i);
    const payload = auth.signUp.mock.calls[0][0];
    expect(payload.email).toBe('amina@example.org');
    expect(payload.options.emailRedirectTo).toBe(`${window.location.origin}/portal`);
    expect(payload.options.data).toMatchObject({ topline_customer_registration: true, marketing_email_opt_in: true, name: 'Amina Wanjiru' });

    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledTimes(1));
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'amina@example.org', options: { emailRedirectTo: `${window.location.origin}/portal` } });
    await screen.findByText(/new verification link is on its way/i);
    // cooldown prevents hammering the send endpoint
    expect((screen.getByRole('button', { name: /resend available in/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(auth.resend).toHaveBeenCalledTimes(1);
  });

  it('registration without consent sends marketing_email_opt_in = false', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'u2', identities: [{}] }, session: null }, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /new customer\? create an account/i }));
    fill(/full name/i, 'No Consent'); fill(/^email/i, 'nc@example.org'); fill(/phone/i, '0700000000'); fill(/^password/i, 'password123');
    fireEvent.click(screen.getByRole('button', { name: /create (customer )?account|register|sign up/i }));
    await screen.findByText(/check your email to finish registration/i);
    expect(auth.signUp.mock.calls[0][0].options.data.marketing_email_opt_in).toBe(false);
  });

  it('signing in before verifying shows a clear message and offers a resend', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: null, error: Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed' }) });
    auth.resend.mockResolvedValue({ data: {}, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    await screen.findByLabelText(/^email/i);
    fill(/^email/i, 'pending@example.org'); fill(/^password/i, 'whatever123');
    fireEvent.click(await screen.findByRole('button', { name: /^sign in$/i }));
    await screen.findByText(/has not been verified yet/i);
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'pending@example.org' })));
  });

  it('shows a rate-limit message when the resend is refused', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: 'u3', identities: [{}] }, session: null }, error: null });
    auth.resend.mockResolvedValue({ data: null, error: Object.assign(new Error('email rate limit exceeded'), { code: 'over_email_send_rate_limit' }) });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /new customer\? create an account/i }));
    fill(/full name/i, 'Rate Limited'); fill(/^email/i, 'rl@example.org'); fill(/phone/i, '0700000001'); fill(/^password/i, 'password123');
    fireEvent.click(screen.getByRole('button', { name: /create (customer )?account|register|sign up/i }));
    await screen.findByText(/check your email to finish registration/i);
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await screen.findByText(/wait a minute/i);
  });
});
