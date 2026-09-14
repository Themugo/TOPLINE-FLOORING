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

export interface StaffPermission {
  resource: string;
  action: string;
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

export async function getCurrentStaffPermissions(): Promise<StaffPermission[]> {
  const { data, error } = await supabase.rpc('get_current_staff_permissions');
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is StaffPermission =>
      Boolean(item) &&
      typeof item === 'object' &&
      'resource' in item &&
      'action' in item &&
      typeof item.resource === 'string' &&
      typeof item.action === 'string',
  );
}

export function hasRole(profile: StaffProfile | null, role: StaffRoleCode): boolean {
  return Boolean(profile?.roles.some((item) => item.code === role));
}

export function hasAnyRole(profile: StaffProfile | null, roles: StaffRoleCode[]): boolean {
  return roles.some((role) => hasRole(profile, role));
}

export function hasPermission(permissions: StaffPermission[], resource: string, action: string): boolean {
  const normalizedAction = action.toLowerCase() === 'read' ? 'select' : action.toLowerCase();
  return permissions.some(
    (permission) =>
      permission.resource === resource &&
      (permission.action === normalizedAction || permission.action === 'manage'),
  );
}
