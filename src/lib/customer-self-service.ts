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

export async function getCustomerPortalDocumentUrl(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('customer-document-download', {
    body: { document_id: documentId },
  });
  if (error) throw error;
  const url = data?.url;
  if (typeof url !== 'string' || !url) throw new Error('Document download is temporarily unavailable');
  return url;
}


export interface CustomerCommunicationTimelineItem {
  id: string; channel: string; direction: string; subject: string | null; message: string;
  status: string; external_reference: string | null; created_at: string;
}

export async function getCustomerCommunicationsSelfService360(): Promise<{ customer_id: string; timeline: CustomerCommunicationTimelineItem[] }> {
  const { data, error } = await supabase.rpc('get_customer_communications_self_service_360');
  if (error) throw error;
  return (data || { customer_id: '', timeline: [] }) as { customer_id: string; timeline: CustomerCommunicationTimelineItem[] };
}
