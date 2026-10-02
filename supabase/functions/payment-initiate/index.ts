import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const clean=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const safeUrl=(v:string|null)=>v&&/^https:\/\//i.test(v)?v:null;

async function tokenHash(value:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function mpesaToken(key:string,secret:string,base:string){const h=btoa(`${key}:${secret}`);const r=await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`,{headers:{Authorization:`Basic ${h}`}});if(!r.ok)throw new Error('M-Pesa authentication failed');const j=await r.json();if(!j.access_token)throw new Error('M-Pesa authentication returned no token');return j.access_token as string;}
function normalizeMpesaPhone(value:string){
  const digits=value.replace(/\D/g,'');
  if(digits.startsWith('254') && digits.length===12) return digits;
  if((digits.startsWith('07') || digits.startsWith('01')) && digits.length===10) return `254${digits.slice(1)}`;
  if((digits.startsWith('7') || digits.startsWith('1')) && digits.length===9) return `254${digits}`;
  return null;
}
function timestamp(){const d=new Date();const p=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}

Deno.serve(async req=>{
  if(req.method!=='POST')return json(405,{success:false,error:'Method Not Allowed'});
  const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json(501,{success:false,error:'Payment service is not configured'});
  let body:any;try{body=await req.json();}catch{return json(400,{success:false,error:'Invalid JSON'});}
  const targetType=clean(body.target_type),targetId=clean(body.target_id),method=clean(body.payment_method),gatewayKey=clean(body.gateway_key),idempotency=clean(body.idempotency_key)||crypto.randomUUID(),phone=clean(body.phone),email=clean(body.email),returnUrl=safeUrl(clean(body.return_url));
  if(!targetType||!targetId||!method||!gatewayKey||!email)return json(400,{success:false,error:'Payment target, method, gateway and customer email are required'});
  if(!['order','invoice'].includes(targetType)||!['mpesa','card','bank_transfer'].includes(method))return json(400,{success:false,error:'Unsupported payment request'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:gateway,error:ge}=await db.from('payment_gateway_methods').select('*').eq('gateway_key',gatewayKey).eq('payment_method',method).eq('is_enabled',true).eq('customer_visible',true).maybeSingle();
  if(ge||!gateway)return json(409,{success:false,error:'This payment method is not currently available'});
  const context=targetType==='order'?'supports_orders':'supports_invoices';if(!gateway[context])return json(409,{success:false,error:'This payment method is not available for this payment'});
  if(['mpesa','card'].includes(method)){
    const {data:releaseGate,error:releaseError}=await db.rpc('get_payment_provider_release_gate_360',{p_gateway_key:gatewayKey});
    if(releaseError||!releaseGate?.ready)return json(503,{success:false,error:'This payment provider is not production-certified and is temporarily unavailable'});
  }
  let target:any,amount:number,customerPhone:string|null=phone;
  if(targetType==='order'){const {data,error}=await db.from('orders').select('id,order_number,total_amount,payment_status,customer_email,customer_phone,status').eq('id',targetId).maybeSingle();if(error||!target)return json(404,{success:false,error:'Order not found'});if(target.status==='cancelled')return json(409,{success:false,error:'Cancelled orders cannot be paid'});if(String(target.customer_email).toLowerCase()!==email.toLowerCase())return json(403,{success:false,error:'Payment customer does not match the order'});amount=Number(target.total_amount);customerPhone=customerPhone||target.customer_phone;}
  else {const {data,error}=await db.from('invoices').select('id,invoice_number,total_amount,amount_paid,status,customer_email,customer_phone').eq('id',targetId).maybeSingle();if(error||!target)return json(404,{success:false,error:'Invoice not found'});if(target.status==='cancelled'||target.status==='paid')return json(409,{success:false,error:'Invoice is not payable'});if(String(target.customer_email||'').toLowerCase()!==email.toLowerCase())return json(403,{success:false,error:'Payment customer does not match the invoice'});amount=Math.max(Number(target.total_amount)-Number(target.amount_paid||0),0);customerPhone=customerPhone||target.customer_phone;}
  if(!Number.isFinite(amount)||amount<=0)return json(409,{success:false,error:'No outstanding balance remains'});
  if(gateway.requires_customer_phone&&!customerPhone)return json(400,{success:false,error:'A customer phone number is required for this payment method'});
  const {data:existing}=await db.from('payment_attempts').select('id,payment_transaction_id,status').eq('idempotency_key',idempotency).maybeSingle();if(existing){return json(200,{success:true,attempt_id:existing.id,payment_transaction_id:existing.payment_transaction_id,status:existing.status,idempotent_replay:true});}
  const accessToken=crypto.randomUUID();
  const customerReturnUrl=returnUrl ? `${returnUrl}${returnUrl.includes('?')?'&':'?'}attempt_id=__ATTEMPT__&access_token=${encodeURIComponent(accessToken)}` : null;
  const {data:tx,error:te}=await db.from('payment_transactions').insert({order_id:targetType==='order'?targetId:null,invoice_id:targetType==='invoice'?targetId:null,amount,currency:'KES',method,provider:gateway.provider,status:'pending',idempotency_key:`attempt:${idempotency}`,metadata:{gateway_key:gatewayKey,target_type:targetType},customer_phone:customerPhone,initiated_at:new Date().toISOString()}).select('id').single();if(te||!tx)return json(500,{success:false,error:'Unable to create payment transaction'});
  const {data:attempt,error:ae}=await db.from('payment_attempts').insert({payment_transaction_id:tx.id,target_type:targetType,target_id:targetId,gateway_key:gatewayKey,payment_method:method,idempotency_key:idempotency,public_token_hash:await tokenHash(accessToken),status:'initiated',return_url:returnUrl}).select('id').single();if(ae||!attempt)return json(500,{success:false,error:'Unable to create payment attempt'});

  try {
    const resolvedReturnUrl=customerReturnUrl?.replace('__ATTEMPT__',attempt.id) ?? null;
    if(method==='bank_transfer'){
      const rawConfig=gateway.public_config||{};
      const allowedBankKeys=['bank_name','account_name','account_number','branch','swift_code','reference_format','instructions'];
      const safeConfig=Object.fromEntries(Object.entries(rawConfig).filter(([key])=>allowedBankKeys.includes(key)));
      await db.from('payment_transactions').update({status:'pending',checkout_expires_at:new Date(Date.now()+72*3600_000).toISOString(),metadata:{gateway_key:gatewayKey,instructions:safeConfig},updated_at:new Date().toISOString()}).eq('id',tx.id);
      await db.from('payment_attempts').update({status:'pending',updated_at:new Date().toISOString()}).eq('id',attempt.id);
      return json(200,{success:true,attempt_id:attempt.id,payment_transaction_id:tx.id,status:'pending',payment_method:method,amount,currency:'KES',instructions:safeConfig,access_token:accessToken,return_url:resolvedReturnUrl});
    }
    if(method==='mpesa'){
      const consumerKey=Deno.env.get('MPESA_CONSUMER_KEY'),consumerSecret=Deno.env.get('MPESA_CONSUMER_SECRET'),shortcode=Deno.env.get('MPESA_SHORTCODE'),passkey=Deno.env.get('MPESA_PASSKEY'),callbackUrl=Deno.env.get('MPESA_CALLBACK_URL');
      if(!consumerKey||!consumerSecret||!shortcode||!passkey||!callbackUrl)throw new Error('M-Pesa is enabled but server credentials/configuration are incomplete');
      const mpesaPhone=normalizeMpesaPhone(String(customerPhone||''));if(!mpesaPhone)throw new Error('Enter a valid Kenyan M-Pesa phone number (07xx, 01xx or 254xx)');if(!Number.isInteger(amount))throw new Error('M-Pesa payments must use a whole KES amount');const base=(Deno.env.get('MPESA_BASE_URL')||'https://api.safaricom.co.ke').replace(/\/$/,'');const token=await mpesaToken(consumerKey,consumerSecret,base);const ts=timestamp();const password=btoa(`${shortcode}${passkey}${ts}`);const account=targetType==='order'?target.order_number:target.invoice_number;const stk={BusinessShortCode:shortcode,Password:password,Timestamp:ts,TransactionType:'CustomerPayBillOnline',Amount:amount,PartyA:mpesaPhone,PartyB:shortcode,PhoneNumber:mpesaPhone,CallBackURL:callbackUrl,AccountReference:account,TransactionDesc:`Topline ${targetType} payment`};
      const r=await fetch(`${base}/mpesa/stkpush/v1/processrequest`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(stk)});const j=await r.json();if(!r.ok||j.ResponseCode&&String(j.ResponseCode)!=='0')throw new Error(j.errorMessage||j.ResponseDescription||'M-Pesa STK request failed');
      const {error:txUpdateError}=await db.from('payment_transactions').update({provider_transaction_id:j.CheckoutRequestID,provider_reference:j.MerchantRequestID,checkout_expires_at:new Date(Date.now()+15*60_000).toISOString(),metadata:{gateway_key:gatewayKey,merchant_request_id:j.MerchantRequestID,checkout_request_id:j.CheckoutRequestID},updated_at:new Date().toISOString()}).eq('id',tx.id);
      if(txUpdateError)throw new Error('M-Pesa request accepted but payment ledger could not be updated');
      const {error:attemptUpdateError}=await db.from('payment_attempts').update({status:'pending',provider_request_id:j.MerchantRequestID,provider_checkout_id:j.CheckoutRequestID,updated_at:new Date().toISOString()}).eq('id',attempt.id);
      if(attemptUpdateError)throw new Error('M-Pesa request accepted but payment attempt could not be updated');
      return json(200,{success:true,attempt_id:attempt.id,payment_transaction_id:tx.id,status:'pending',payment_method:method,amount,currency:'KES',message:j.CustomerMessage||'Check your phone and enter your M-Pesa PIN.',access_token:accessToken,return_url:resolvedReturnUrl});
    }
    const cardUrl=clean((gateway.public_config||{}).initiation_url)||Deno.env.get('CARD_GATEWAY_INITIATE_URL');const cardSecret=Deno.env.get('CARD_GATEWAY_SECRET');if(!cardUrl||!cardSecret)throw new Error('Card gateway is enabled but its server initiation configuration is incomplete');
    const callback=Deno.env.get('PAYMENT_CARD_CALLBACK_URL')||Deno.env.get('PAYMENT_CALLBACK_URL')||`${url}/functions/v1/payment-callback`;const reference=targetType==='order'?target.order_number:target.invoice_number;
    const r=await fetch(cardUrl,{method:'POST',headers:{Authorization:`Bearer ${cardSecret}`,'Content-Type':'application/json'},body:JSON.stringify({amount,currency:'KES',reference,order_id:targetType==='order'?targetId:null,invoice_id:targetType==='invoice'?targetId:null,customer:{email,phone:customerPhone},return_url:resolvedReturnUrl,callback_url:callback})});const j=await r.json();if(!r.ok)throw new Error(j.message||j.error||'Card gateway checkout could not be created');const checkoutUrl=clean(j.checkout_url)||clean(j.redirect_url)||clean(j.url);const providerTx=clean(j.transaction_id)||clean(j.id);if(!checkoutUrl)throw new Error('Card gateway did not return a checkout URL');
    await db.from('payment_transactions').update({provider_transaction_id:providerTx,provider_reference:clean(j.reference)||reference,checkout_url:checkoutUrl,checkout_expires_at:j.expires_at||null,metadata:{gateway_key:gatewayKey,card_response:{reference:clean(j.reference)||null}},updated_at:new Date().toISOString()}).eq('id',tx.id);await db.from('payment_attempts').update({status:'pending',provider_checkout_id:providerTx,updated_at:new Date().toISOString()}).eq('id',attempt.id);
    return json(200,{success:true,attempt_id:attempt.id,payment_transaction_id:tx.id,status:'pending',payment_method:method,amount,currency:'KES',checkout_url:checkoutUrl,access_token:accessToken,return_url:resolvedReturnUrl});
  } catch(e){const message=e instanceof Error?e.message:'Payment initiation failed';await db.from('payment_transactions').update({status:'failed',failure_reason:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',tx.id);await db.from('payment_attempts').update({status:'failed',failure_reason:message,updated_at:new Date().toISOString()}).eq('id',attempt.id);return json(502,{success:false,error:message,attempt_id:attempt.id});}
});
