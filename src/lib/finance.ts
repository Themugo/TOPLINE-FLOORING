import { supabase } from '@/lib/supabase';

export interface InvoiceTransactionResult { success?: boolean; invoice_id?: string; error?: string }
export interface InvoiceInput { customer_id?: string | null; order_id?: string | null; quotation_id?: string | null; customer_name: string; customer_email?: string | null; customer_phone?: string | null; billing_address?: string | null; tax_rate?: number; due_date?: string | null; notes?: string | null }
export interface InvoiceItemTransactionResult { success?: boolean; invoice_item_id?: string; error?: string }
export interface InvoicePaymentTransactionResult { success?: boolean; payment_id?: string; error?: string }

export async function createInvoiceTransaction(input: InvoiceInput): Promise<InvoiceTransactionResult> {
  const { data, error } = await supabase.rpc('create_invoice_transaction', { p_customer_id:input.customer_id??null,p_order_id:input.order_id??null,p_quotation_id:input.quotation_id??null,p_customer_name:input.customer_name,p_customer_email:input.customer_email??null,p_customer_phone:input.customer_phone??null,p_billing_address:input.billing_address??null,p_tax_rate:input.tax_rate??16,p_due_date:input.due_date??null,p_notes:input.notes??null });
  if(error)throw error; return (data ?? {}) as InvoiceTransactionResult;
}
export async function addInvoiceItemTransaction(invoiceId:string,item:{description:string;quantity:number;unit_price:number}): Promise<InvoiceItemTransactionResult> {
  const {data,error}=await supabase.rpc('add_invoice_item_transaction',{p_invoice_id:invoiceId,p_description:item.description,p_quantity:item.quantity,p_unit_price:item.unit_price});
  if(error)throw error; return (data ?? {}) as InvoiceItemTransactionResult;
}
export async function recordInvoicePaymentTransaction(invoiceId:string,amount:number,method:string,reference?:string,notes?:string): Promise<InvoicePaymentTransactionResult> {
  const {data,error}=await supabase.rpc('record_invoice_payment_transaction',{p_invoice_id:invoiceId,p_amount:amount,p_method:method,p_reference:reference||null,p_notes:notes||null});
  if(error)throw error; return (data ?? {}) as InvoicePaymentTransactionResult;
}
export async function updateInvoiceStatusTransaction(invoiceId:string,status:string): Promise<InvoiceTransactionResult> {
  const {data,error}=await supabase.rpc('update_invoice_status_transaction',{p_invoice_id:invoiceId,p_status:status});
  if(error)throw error; return (data ?? {}) as InvoiceTransactionResult;
}

export async function removeInvoiceItemTransaction(invoiceId: string, itemId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('remove_invoice_item_transaction', { p_invoice_id: invoiceId, p_item_id: itemId });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function deleteDraftInvoiceTransaction(invoiceId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('delete_draft_invoice_transaction', { p_invoice_id: invoiceId });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
