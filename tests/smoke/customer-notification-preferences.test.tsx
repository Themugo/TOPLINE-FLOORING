import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression: the portal sent bare field names (email_enabled ...) but the database function's parameters are prefixed
// p_ (p_email_enabled ...), so saving preferences always failed with "function not found" and customers could never
// opt out of SMS or marketing messages.
const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) }, publicSupabase: {}, isSupabaseConfigured: true }));

import { updateCustomerNotificationPreferences } from '@/lib/customer-self-service';

describe('updateCustomerNotificationPreferences', () => {
  beforeEach(() => rpc.mockReset());

  it('sends the p_-prefixed parameters the database function expects', async () => {
    rpc.mockResolvedValue({ data: { customer_id: 'c1', email_enabled: true, sms_enabled: false, whatsapp_enabled: false, marketing_email_enabled: false, marketing_sms_enabled: false }, error: null });
    await updateCustomerNotificationPreferences({ email_enabled: true, sms_enabled: false, whatsapp_enabled: false, marketing_email_enabled: false, marketing_sms_enabled: false });
    expect(rpc).toHaveBeenCalledWith('update_customer_notification_preferences', {
      p_email_enabled: true, p_sms_enabled: false, p_whatsapp_enabled: false, p_marketing_email_enabled: false, p_marketing_sms_enabled: false,
    });
  });

  it('surfaces a database error instead of pretending the preferences were saved', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Customer portal access is not available for this account' } });
    await expect(updateCustomerNotificationPreferences({ email_enabled: true, sms_enabled: true, whatsapp_enabled: true, marketing_email_enabled: true, marketing_sms_enabled: true })).rejects.toBeTruthy();
  });
});
