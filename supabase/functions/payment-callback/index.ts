import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual } from "../_shared/security.ts";

interface StkCallback {
  CheckoutRequestID?: unknown;
  MerchantRequestID?: unknown;
  ResultCode?: unknown;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: unknown }> };
}
interface CallbackBody {
  provider?: unknown;
  Body?: { stkCallback?: StkCallback };
  stkCallback?: StkCallback;
  [key: string]: unknown;
}
const json=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const clean=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
Deno.serve(async req=>{
 if(req.method!=='POST'&&req.method!=='GET')return json(405,{success:false,error:'Method Not Allowed'});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json(501,{success:false,error:'Payment callback service is not configured'});
 let body:CallbackBody={};let rawBody='';try{if(req.method==='GET'){body=Object.fromEntries(new URL(req.url).searchParams.entries());}else{rawBody=await req.text();body=JSON.parse(rawBody);}}catch{return json(400,{success:false,error:'Invalid callback payload'});}
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});let provider=(clean(req.headers.get('x-payment-provider'))||clean(body.provider)||'').toLowerCase();
 if(!provider && body.Body?.stkCallback)provider='mpesa';
 if(provider==='mpesa'){
   // Safaricom does not sign callbacks. When MPESA_CALLBACK_SECRET is set, the registered MPESA_CALLBACK_URL must carry ?secret=<value>.
   const callbackSecret=Deno.env.get('MPESA_CALLBACK_SECRET');if(callbackSecret&&!constantTimeEqual(new URL(req.url).searchParams.get('secret')||'',callbackSecret))return json(401,{success:false,error:'Invalid callback secret'});
   const cb=body.Body?.stkCallback||body.stkCallback;if(!cb)return json(400,{success:false,error:'Invalid M-Pesa callback'});const checkout=clean(cb.CheckoutRequestID);if(!checkout)return json(400,{success:false,error:'Missing M-Pesa checkout reference'});
   const items=Array.isArray(cb.CallbackMetadata?.Item)?cb.CallbackMetadata.Item:[];const get=(name:string)=>items.find((x:{Name?:string;Value?:unknown})=>x.Name===name)?.Value;const receipt=clean(get('MpesaReceiptNumber'));const amount=Number(get('Amount'));const resultCode=Number(cb.ResultCode);const status=resultCode===0?'successful':'failed';const merchantRequest=clean(cb.MerchantRequestID);
   const {data:tx,error}=await db.from('payment_transactions').select('id,order_id,invoice_id,amount,provider_transaction_id,provider_reference').eq('provider','mpesa').eq('provider_transaction_id',checkout).maybeSingle();if(error||!tx)return json(404,{success:false,error:'Payment attempt not found'});if(tx.provider_reference&&merchantRequest&&tx.provider_reference!==merchantRequest)return json(409,{success:false,error:'M-Pesa merchant request does not match payment attempt'});
   if(status==='successful'&&(!receipt||!Number.isFinite(amount)||amount!==Number(tx.amount)))return json(409,{success:false,error:'M-Pesa callback failed payment identity checks'});
   const targetId=tx.order_id||tx.invoice_id;const targetType=tx.order_id?'order':'invoice';const {data}=await db.rpc('apply_customer_payment_provider_event',{p_provider:'mpesa',p_provider_event_id:`mpesa:${checkout}:${resultCode}`,p_event_type:status==='successful'?'payment.success':'payment.failed',p_status:status,p_amount:Number.isFinite(amount)&&amount>0?amount:Number(tx.amount),p_currency:'KES',p_order_id:tx.order_id,p_invoice_id:tx.invoice_id,p_provider_transaction_id:receipt||checkout,p_provider_reference:checkout,p_payload:body});if(!data&&status==='failed'){await db.from('payment_transactions').update({status:'failed',failure_reason:cb.ResultDesc||'M-Pesa payment failed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',tx.id);await db.from('payment_attempts').update({status:'failed',failure_reason:cb.ResultDesc||'M-Pesa payment failed',updated_at:new Date().toISOString()}).eq('payment_transaction_id',tx.id);}return json(200,{success:true,status,target_id:targetId,target_type:targetType});
 }
 const secret=Deno.env.get('PAYMENT_CARD_WEBHOOK_SECRET')||Deno.env.get('PAYMENT_WEBHOOK_SECRET');if(!secret)return json(501,{success:false,error:'Card callback secret is not configured'});const supplied=clean(req.headers.get('x-payment-signature'));if(!supplied)return json(401,{success:false,error:'Missing callback signature'});const raw=req.method==='GET'?JSON.stringify(body):rawBody;const mac=new Uint8Array(await crypto.subtle.sign('HMAC',{name:'HMAC',hash:'SHA-256'},await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(raw)));const expected=[...mac].map(x=>x.toString(16).padStart(2,'0')).join('');if(supplied.replace(/^sha256=/i,'').toLowerCase()!==expected.toLowerCase())return json(401,{success:false,error:'Invalid callback signature'});
 const eventId=clean(body.event_id)||clean(body.id)||clean(body.transaction_id);const providerTx=clean(body.provider_transaction_id)||clean(body.transaction_id);const amount=Number(body.amount);const status=String(body.status||'').toLowerCase();const orderId=clean(body.order_id);const invoiceId=clean(body.invoice_id);if(!eventId||!providerTx||!Number.isFinite(amount)||!['successful','success','paid','failed','failure'].includes(status))return json(400,{success:false,error:'Invalid card callback'});const {data,error}=await db.rpc('apply_customer_payment_provider_event',{p_provider:'card',p_provider_event_id:eventId,p_event_type:status==='failed'||status==='failure'?'payment.failed':'payment.success',p_status:status,p_amount:amount,p_currency:clean(body.currency)||'KES',p_order_id:orderId,p_invoice_id:invoiceId,p_provider_transaction_id:providerTx,p_provider_reference:clean(body.reference),p_payload:body});if(error)return json(500,{success:false,error:'Card payment callback could not be applied'});return json(200,data||{success:true});
});
