import { supabase } from '@/lib/supabase';

export type StaffRoleCode =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'sales'
  | 'operations'
  | 'finance'
  | 'marketing'
  | 'staff';

export interface StaffRole {
  code: StaffRoleCode;
  name: string;
}

export interface StaffProfile {
  user_id: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
  roles: StaffRole[];
}

export async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
  const { data, error } = await supabase.rpc('get_current_staff_profile');
  if (error) throw error;
  if (!data || typeof data !== 'object' || !('user_id' in data)) return null;
  return data as StaffProfile;
}

/**
 * UI convenience only. Database RLS remains the authoritative authorization
 * boundary and must never be replaced by this client-side check.
 */
export function hasRole(profile: StaffProfile | null, role: StaffRoleCode): boolean {
  return Boolean(profile?.roles.some((item) => item.code === role));
}

export function hasAnyRole(profile: StaffProfile | null, roles: StaffRoleCode[]): boolean {
  return roles.some((role) => hasRole(profile, role));
}
