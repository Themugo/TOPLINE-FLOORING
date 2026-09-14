import { supabase } from '@/lib/supabase';

export type CustomerLifecycleCustomer={id:string;name:string;phone?:string|null;email?:string|null;open_service_cases?:number;overdue_service_cases?:number;overdue_maintenance?:number;overdue_renewals?:number;low_feedback?:number;risk_score?:number;[key:string]:unknown};
export type CustomerLifecycleOperations360={metrics:Record<string,number>;customers:CustomerLifecycleCustomer[];[key:string]:unknown};
export type CustomerLifecycleReconcileResult={warranty_cases_checked?:number;maintenance_visits_marked_missed?:number;[key:string]:unknown};
export async function getCustomerLifecycleOperations360():Promise<CustomerLifecycleOperations360>{const {data,error}=await supabase.rpc('get_customer_lifecycle_operations_360');if(error)throw error;return (data??{metrics:{},customers:[]}) as CustomerLifecycleOperations360;}
export async function getCustomerLifecycle360(customerId?:string|null):Promise<CustomerLifecycleCustomer[]|CustomerLifecycleOperations360>{const {data,error}=await supabase.rpc('get_customer_lifecycle_360',{p_customer_id:customerId??null});if(error)throw error;return data as CustomerLifecycleCustomer[]|CustomerLifecycleOperations360;}
export async function reconcileCustomerLifecycle360():Promise<CustomerLifecycleReconcileResult>{const {data,error}=await supabase.rpc('reconcile_customer_lifecycle_360');if(error)throw error;return (data??{}) as CustomerLifecycleReconcileResult;}
