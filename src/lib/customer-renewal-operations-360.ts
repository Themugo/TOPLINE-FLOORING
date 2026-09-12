import { supabase } from '@/lib/supabase';
export async function getCustomerRenewalOperations360(){const {data,error}=await supabase.rpc('get_customer_renewal_operations_360');if(error)throw error;return data as any;}
export async function refreshCustomerRenewalOpportunities360(){const {data,error}=await supabase.rpc('refresh_customer_renewal_opportunities_360');if(error)throw error;return data as any;}
export async function transitionCustomerRenewal360(opportunityId:string,status:string,nextActionOn?:string|null,notes?:string|null){const {data,error}=await supabase.rpc('transition_customer_renewal_360',{p_opportunity_id:opportunityId,p_status:status,p_next_action_on:nextActionOn??null,p_notes:notes??null});if(error)throw error;return data as any;}
export async function getCustomerRenewalHistory360(opportunityId:string){const {data,error}=await supabase.rpc('get_customer_renewal_history_360',{p_opportunity_id:opportunityId});if(error)throw error;return data as any;}
