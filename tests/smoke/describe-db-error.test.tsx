import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: {}, publicSupabase: {}, isSupabaseConfigured: true }));
import { describeDbError } from '@/lib/db';

describe('describeDbError', () => {
  it('passes through readable messages raised by database rules', () => {
    expect(describeDbError({ message: 'Paid or partially paid orders require payment/refund handling before cancellation', code: 'P0001' }))
      .toBe('Paid or partially paid orders require payment/refund handling before cancellation');
  });
  it('does not mistake a business "expired" message for an expired login', () => {
    expect(describeDbError({ message: 'This quotation expired on 2026-11-01. Please request changes.', code: 'P0001' })).toMatch(/quotation expired/);
  });
  it('still tells the user to sign in again when the session really expired', () => {
    expect(describeDbError({ message: 'JWT expired' })).toMatch(/sign in again/i);
    expect(describeDbError({ message: 'session token has expired' })).toMatch(/sign in again/i);
  });
  it('explains permission failures plainly', () => {
    expect(describeDbError({ message: 'new row violates row-level security policy', code: '42501' })).toBe('You do not have permission to do this.');
  });
});
