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

export interface CustomerProjectDocument {
  id: string;
  project_id: string;
  project_title: string | null;
  file_name: string;
  doc_type: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  storage_path: string;
}

export async function getCustomerPortalPreferences(): Promise<CustomerPortalPreferences> {
  const { data, error } = await supabase.rpc('get_customer_portal_preferences');
  if (error) throw error;
  return data as CustomerPortalPreferences;
}

export async function updateCustomerNotificationPreferences(input: Omit<CustomerNotificationPreferences, 'customer_id' | 'updated_at'>) {
  // The database function's parameters are prefixed p_; sending the bare field names fails with "function not found".
  const { data, error } = await supabase.rpc('update_customer_notification_preferences', {
    p_email_enabled: input.email_enabled,
    p_sms_enabled: input.sms_enabled,
    p_whatsapp_enabled: input.whatsapp_enabled,
    p_marketing_email_enabled: input.marketing_email_enabled,
    p_marketing_sms_enabled: input.marketing_sms_enabled,
  });
  if (error) throw error;
  return data as CustomerNotificationPreferences;
}

export async function getCustomerPortalDocuments(): Promise<CustomerPortalDocument[]> {
  const { data, error } = await supabase.rpc('get_customer_portal_documents');
  if (error) throw error;
  return (data || []) as CustomerPortalDocument[];
}

export async function getCustomerProjectDocuments(): Promise<CustomerProjectDocument[]> {
  const { data, error } = await supabase.rpc('get_customer_project_documents');
  if (error) throw error;
  return (data || []) as CustomerProjectDocument[];
}

export async function createCustomerProjectDocumentUrl(storagePath: string, downloadName?: string): Promise<string> {
  if (!storagePath.startsWith('projects/')) throw new Error('Invalid project document path');
  const { data, error } = await supabase.storage.from('private-documents').createSignedUrl(
    storagePath, 60, downloadName ? { download: downloadName } : undefined
  );
  if (error || !data?.signedUrl) throw error ?? new Error('Could not create a secure document link');
  return data.signedUrl;
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
