import { supabase } from '@/lib/supabase';
export type IdentitySnapshot = { generated_at:string; metrics:Record<string,number>; staff:Array<{user_id:string;display_name:string;job_title:string|null;is_active:boolean;roles:string[]}>; pending_requests:Array<Record<string,unknown>>; recent_events:Array<Record<string,unknown>> };
const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;};
export async function getIdentityAccess360(){return (await rpc('get_identity_access_360',{})) as IdentitySnapshot;}
export async function changeStaffStatus(userId:string,isActive:boolean,reason:string){return rpc('change_staff_status',{p_user_id:userId,p_is_active:isActive,p_reason:reason});}
export async function assignStaffRole(userId:string,roleCode:string,reason:string){return rpc('assign_staff_role',{p_user_id:userId,p_role_code:roleCode,p_reason:reason});}
export async function revokeStaffRole(userId:string,roleCode:string,reason:string){return rpc('revoke_staff_role',{p_user_id:userId,p_role_code:roleCode,p_reason:reason});}
export async function decidePrivilegedAccessRequest(requestId:string,status:'approved'|'rejected'|'revoked',notes:string){return rpc('decide_privileged_access_request',{p_request_id:requestId,p_status:status,p_decision_notes:notes});}
