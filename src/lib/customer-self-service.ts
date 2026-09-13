import { supabase } from '@/lib/supabase';

export interface CustomerNotificationPreferences {
  customer_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  marketing_email_enabled: boolean;
  marketing_sms_enabled: boolean;
  updated_at?: string;
}

export interface CustomerPortalPreferences {
  customer_preferences: Record<string, unknown>;
  notification_preferences: CustomerNotificationPreferences;
}

export interface CustomerPortalDocument {
  id: string;
  document_type: string;
  document_name: string;
  description: string | null;
  created_at: string;
}

export async function getCustomerPortalPreferences(): Promise<CustomerPortalPreferences> {
  const { data, error } = await supabase.rpc('get_customer_portal_preferences');
  if (error) throw error;
  return data as CustomerPortalPreferences;
}

export async function updateCustomerNotificationPreferences(input: Omit<CustomerNotificationPreferences, 'customer_id' | 'updated_at'>) {
  const { data, error } = await supabase.rpc('update_customer_notification_preferences', input);
  if (error) throw error;
  return data as CustomerNotificationPreferences;
}

export async function getCustomerPortalDocuments(): Promise<CustomerPortalDocument[]> {
  const { data, error } = await supabase.rpc('get_customer_portal_documents');
  if (error) throw error;
  return (data || []) as CustomerPortalDocument[];
}
