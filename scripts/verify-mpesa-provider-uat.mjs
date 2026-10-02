const endpoint=(process.env.PAYMENT_INITIATE_URL||'').trim();
const orderId=(process.env.PAYMENT_UAT_ORDER_ID||'').trim();
const email=(process.env.PAYMENT_UAT_EMAIL||'').trim().toLowerCase();
const phone=(process.env.PAYMENT_UAT_PHONE||'').trim();
const gatewayKey=(process.env.PAYMENT_UAT_GATEWAY_KEY||'mpesa').trim();
const amount=Number(process.env.PAYMENT_UAT_EXPECTED_AMOUNT||'0');
const fail=m=>{console.error(`FAIL: ${m}`);process.exit(1)};
if(!endpoint||!orderId||!email||!phone){ console.log('M-Pesa provider UAT: PENDING (requires isolated UAT endpoint, order, customer email and test phone).'); process.exit(0); }
const idempotency=`mpesa-uat-${orderId}`;
const body={target_type:'order',target_id:orderId,email,phone,payment_method:'mpesa',gateway_key:gatewayKey,idempotency_key:idempotency,return_url:process.env.PAYMENT_UAT_RETURN_URL||undefined};
const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const data=await r.json().catch(()=>({}));
if(!r.ok||!data.success) fail(`M-Pesa initiation rejected: HTTP ${r.status} ${JSON.stringify(data)}`);
if(data.payment_method!=='mpesa'||!data.attempt_id||!data.access_token) fail(`Unexpected initiation response: ${JSON.stringify(data)}`);
if(amount>0&&Number(data.amount)!==amount) fail(`Amount mismatch: expected ${amount}, received ${data.amount}`);
console.log(`PASS: M-Pesa ${process.env.MPESA_UAT_ENV||'sandbox'} initiation accepted.`);
console.log(JSON.stringify({attempt_id:data.attempt_id,payment_transaction_id:data.payment_transaction_id,status:data.status,amount:data.amount,message:data.message||null},null,2));
console.log('Complete the provider-side UAT transaction on the test phone, then verify the callback/return flow and duplicate callback behavior before production activation.');
