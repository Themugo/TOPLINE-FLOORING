import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: {}, publicSupabase: {}, isSupabaseConfigured: true }));
import { assertLifecycleSuccess } from '@/lib/lifecycle';

// The database often refuses a request by returning {success:false,error} rather than raising. Screens that only
// await the call used to announce success for a change that never happened.
describe('assertLifecycleSuccess', () => {
  it('passes a successful result through unchanged', () => {
    const ok = { success: true, project_id: 'p1' };
    expect(assertLifecycleSuccess(ok)).toBe(ok);
  });
  it('turns a soft refusal into an error carrying the database reason', () => {
    expect(() => assertLifecycleSuccess({ success: false, error: 'Completed or cancelled site visits cannot be reopened' })).toThrow('Completed or cancelled site visits cannot be reopened');
  });
  it('still throws something readable when no reason is given', () => {
    expect(() => assertLifecycleSuccess({ success: false })).toThrow('The change was not accepted');
  });
  it('ignores results that carry no success flag', () => {
    expect(assertLifecycleSuccess(undefined)).toBeUndefined();
    expect(assertLifecycleSuccess({ id: 1 })).toEqual({ id: 1 });
  });
});
