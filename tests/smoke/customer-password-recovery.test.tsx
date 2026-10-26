import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeStub } from './supabase-stub';

const hoisted = vi.hoisted(() => ({
  hash: '',
  signedIn: false,
  auth: { resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn() },
}));

vi.mock('@/lib/supabase', () => {
  const base = makeStub(() => ({ data: [], error: null, count: 0 }));
  // Values are read live (not captured when the factory runs) because vitest caches the factory between tests.
  const auth = {
    ...base.auth,
    getSession: async () => ({ data: { session: hoisted.signedIn ? { user: { id: 'u1', email: 'amina@example.org' }, access_token: 'stub' } : null }, error: null }),
    getUser: async () => ({ data: { user: hoisted.signedIn ? { id: 'u1', email: 'amina@example.org' } : null }, error: null }),
    resetPasswordForEmail: (...a: unknown[]) => hoisted.auth.resetPasswordForEmail(...a),
    updateUser: (...a: unknown[]) => hoisted.auth.updateUser(...a),
    verifyOtp: (...a: unknown[]) => hoisted.auth.verifyOtp(...a),
  };
  const client = { ...base, auth };
  return { supabase: client, publicSupabase: client, isSupabaseConfigured: true };
});
// Read live: vitest caches the factory between tests.
vi.mock('@/lib/auth-url', () => ({ get INITIAL_AUTH_URL_HASH() { return hoisted.hash; } }));

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('customer password recovery and email-link problems', () => {
  beforeEach(() => {
    vi.resetModules();
    hoisted.hash = ''; hoisted.signedIn = false;
    hoisted.auth.resetPasswordForEmail.mockReset(); hoisted.auth.updateUser.mockReset(); hoisted.auth.verifyOtp.mockReset();
    window.history.pushState({}, '', '/portal');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('requests a reset link and answers neutrally, with the portal as the redirect', async () => {
    hoisted.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /forgot your password/i }));
    fill(/^email/i, 'Amina@Example.org');
    fireEvent.click(screen.getByRole('button', { name: /email me a reset link/i }));
    await screen.findByText(/if an account exists for/i);
    expect(hoisted.auth.resetPasswordForEmail).toHaveBeenCalledWith('amina@example.org', { redirectTo: `${window.location.origin}/portal` });
    expect(screen.getByText(/amina@example.org/i)).toBeTruthy();
  });

  it('shows a clear message when the reset request is refused', async () => {
    hoisted.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: Object.assign(new Error('email rate limit exceeded'), { code: 'over_email_send_rate_limit' }) });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /forgot your password/i }));
    fill(/^email/i, 'rl@example.org');
    fireEvent.click(screen.getByRole('button', { name: /email me a reset link/i }));
    await screen.findByText(/wait a minute/i);
    expect(screen.queryByText(/if an account exists for/i)).toBeNull();
  });

  it('explains an expired or already-used email link', async () => {
    hoisted.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    const { default: App } = await import('@/App');
    render(<App />);
    await screen.findByText(/expired or was already used/i);
    expect(screen.getByRole('alert').textContent).toMatch(/request a new link/i);
  });

  it('lets someone arriving from a recovery link choose a new password', async () => {
    hoisted.hash = '#access_token=abc&type=recovery';
    hoisted.signedIn = true;
    hoisted.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    await screen.findByText(/choose a new password/i);

    fill(/^new password/i, 'short');
    fill(/confirm new password/i, 'short');
    fireEvent.click(screen.getByRole('button', { name: /save new password/i }));
    await screen.findByText(/at least 8 characters\./i, { selector: '[role="alert"]' });
    expect(hoisted.auth.updateUser).not.toHaveBeenCalled();

    fill(/^new password/i, 'a-good-password-1');
    fill(/confirm new password/i, 'a-different-one-2');
    fireEvent.click(screen.getByRole('button', { name: /save new password/i }));
    await screen.findByText(/do not match/i);
    expect(hoisted.auth.updateUser).not.toHaveBeenCalled();

    fill(/confirm new password/i, 'a-good-password-1');
    fireEvent.click(screen.getByRole('button', { name: /save new password/i }));
    await waitFor(() => expect(hoisted.auth.updateUser).toHaveBeenCalledWith({ password: 'a-good-password-1' }));
    await screen.findByText(/password updated/i);
  });
});

describe('scanner-proof email links (token_hash)', () => {
  beforeEach(() => {
    vi.resetModules();
    hoisted.hash = ''; hoisted.signedIn = false;
    hoisted.auth.verifyOtp.mockReset(); hoisted.auth.updateUser.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('does not spend the token when the page merely opens, only when the buyer presses the button', async () => {
    window.history.pushState({}, '', '/portal?token_hash=abc123&type=signup');
    hoisted.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    await screen.findByText(/confirm your email address/i);
    expect(hoisted.auth.verifyOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /confirm my email/i }));
    await waitFor(() => expect(hoisted.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'signup' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /confirm my email/i })).toBeNull());
    expect(window.location.search).toBe('');
  });

  it('explains an expired token and lets the buyer go back to sign in', async () => {
    window.history.pushState({}, '', '/portal?token_hash=old&type=signup');
    hoisted.auth.verifyOtp.mockResolvedValue({ data: null, error: Object.assign(new Error('Email link is invalid or has expired'), { code: 'otp_expired' }) });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /confirm my email/i }));
    await screen.findByText(/request a new one/i);
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    await screen.findByRole('button', { name: /^sign in$/i });
  });

  it('a recovery token leads straight to choosing a new password', async () => {
    window.history.pushState({}, '', '/portal?token_hash=rec1&type=recovery');
    hoisted.signedIn = true;
    hoisted.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    const { default: App } = await import('@/App');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(hoisted.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'rec1', type: 'recovery' }));
    await screen.findByText(/choose a new password/i);
  });

  it('ignores unsupported token types', async () => {
    window.history.pushState({}, '', '/portal?token_hash=x&type=invite');
    const { default: App } = await import('@/App');
    render(<App />);
    await screen.findByRole('button', { name: /^sign in$/i });
    expect(screen.queryByText(/confirm your email address/i)).toBeNull();
  });
});

