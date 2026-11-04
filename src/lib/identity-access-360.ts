import { supabase } from '@/lib/supabase';

export type StaffMember = {
  user_id: string; display_name: string; job_title: string | null; phone: string | null; email: string | null;
  is_active: boolean; is_self: boolean; protected: boolean; can_manage: boolean; roles: string[];
};
export type IdentitySnapshot = {
  generated_at: string; viewer?: string; viewer_is_owner?: boolean; metrics: Record<string, number>; staff: StaffMember[];
  pending_requests: Array<Record<string, unknown>>; recent_events: Array<Record<string, unknown>>;
};
export type StaffInvitation = {
  id: string; email: string; display_name: string | null; job_title: string | null; role_code: string; role_name: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired'; expires_at: string; created_at: string;
};
export type RoleCatalogEntry = {
  code: string; name: string; description: string | null; members: number; permissions: Array<{ resource: string; action: string }>;
};

const rpc = async (name: string, args: Record<string, unknown>) => { const { data, error } = await supabase.rpc(name, args); if (error) throw error; return data; };

export async function getIdentityAccess360() { return (await rpc('get_identity_access_360', {})) as IdentitySnapshot; }
export async function changeStaffStatus(userId: string, isActive: boolean, reason: string) { return rpc('change_staff_status', { p_user_id: userId, p_is_active: isActive, p_reason: reason }); }
export async function assignStaffRole(userId: string, roleCode: string, reason: string) { return rpc('assign_staff_role', { p_user_id: userId, p_role_code: roleCode, p_reason: reason }); }
export async function revokeStaffRole(userId: string, roleCode: string, reason: string) { return rpc('revoke_staff_role', { p_user_id: userId, p_role_code: roleCode, p_reason: reason }); }
export async function decidePrivilegedAccessRequest(requestId: string, status: 'approved' | 'rejected' | 'revoked', notes: string) { return rpc('decide_privileged_access_request', { p_request_id: requestId, p_status: status, p_decision_notes: notes }); }
export async function updateStaffMember(userId: string, displayName: string, jobTitle: string, phone: string) { return rpc('update_staff_member', { p_user_id: userId, p_display_name: displayName, p_job_title: jobTitle, p_phone: phone }); }
export async function inviteStaff(email: string, roleCode: string, displayName: string, jobTitle: string, validDays = 14) { return rpc('invite_staff', { p_email: email, p_role_code: roleCode, p_display_name: displayName, p_job_title: jobTitle, p_valid_days: validDays }); }
export async function getStaffInvitations() { return ((await rpc('get_staff_invitations', {})) ?? []) as StaffInvitation[]; }
export async function revokeStaffInvitation(id: string) { return rpc('revoke_staff_invitation', { p_invitation_id: id }); }
export async function getStaffRoleCatalog() { return ((await rpc('get_staff_role_catalog', {})) ?? []) as RoleCatalogEntry[]; }
export async function acceptStaffInvitation() { return (await rpc('accept_staff_invitation', {})) as { accepted: boolean; reason?: string; role_code?: string }; }
