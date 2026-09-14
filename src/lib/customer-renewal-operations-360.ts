import { supabase } from '@/lib/supabase';
export type CustomerRenewalOpportunity={id:string;customer_name:string;customer_phone?:string|null;customer_email?:string|null;plan_name:string;plan_number?:string|null;renewal_due_on:string;priority:string;status:string;[key:string]:unknown};
export type CustomerRenewalOperations360={metrics:Record<string,number>;opportunities:CustomerRenewalOpportunity[];[key:string]:unknown};
export type RenewalRefreshResult={updated_count?:number;[key:string]:unknown};
export type RenewalTransitionResult={status?:string;[key:string]:unknown};
export async function getCustomerRenewalOperations360():Promise<CustomerRenewalOperations360>{const {data,error}=await supabase.rpc('get_customer_renewal_operations_360');if(error)throw error;return (data??{metrics:{},opportunities:[]}) as CustomerRenewalOperations360;}
export async function refreshCustomerRenewalOpportunities360():Promise<RenewalRefreshResult>{const {data,error}=await supabase.rpc('refresh_customer_renewal_opportunities_360');if(error)throw error;return (data??{}) as RenewalRefreshResult;}
export async function transitionCustomerRenewal360(opportunityId:string,status:string,nextActionOn?:string|null,notes?:string|null):Promise<RenewalTransitionResult>{const {data,error}=await supabase.rpc('transition_customer_renewal_360',{p_opportunity_id:opportunityId,p_status:status,p_next_action_on:nextActionOn??null,p_notes:notes??null});if(error)throw error;return (data??{}) as RenewalTransitionResult;}
export async function getCustomerRenewalHistory360(opportunityId:string):Promise<unknown>{const {data,error}=await supabase.rpc('get_customer_renewal_history_360',{p_opportunity_id:opportunityId});if(error)throw error;return data;}
