import sys,json,urllib.request,urllib.error,time; sys.path.insert(0,'/tmp/dbtest')
exec(open('/tmp/dbtest/e2e_full.py').read().split("# ---------- seed")[0])
import time
RUN=str(int(time.time())%1000000)
BASE='http://127.0.0.1:54321'
ORIGIN='https://toplinefloorandwaterproofing.co.ke'
def http(method,path,body=None,headers=None):
    h={'Content-Type':'application/json','Origin':ORIGIN}; h.update(headers or {})
    req=urllib.request.Request(BASE+path,data=(json.dumps(body).encode() if body is not None else None),method=method,headers=h)
    try:
        with urllib.request.urlopen(req,timeout=40) as r: raw=r.read().decode(); code=r.status
    except urllib.error.HTTPError as e: raw=e.read().decode(); code=e.code
    try: return code,json.loads(raw)
    except Exception: return code,raw
def mock(): return http('GET','/__mock/calls')[1]
def reset(): http('GET','/__mock/reset')
PROD=q1("select id from public.products where slug='epoxy-floor-kit'"); ZONE=q1("select id from public.delivery_zones limit 1")
def new_order(key,price_qty=1,method='mpesa'):
    items=json.dumps([{"product_id":PROD,"quantity":price_qty}])
    key=key+RUN
    phone='07'+str(10000000+abs(hash(key))%80000000)
    ok,r=call('anon',f"select public.create_secure_customer_order('Grace Njeri','grace{key}@example.co.ke','{phone}','{items}'::jsonb,'',NULL,'{ZONE}','Karen, Nairobi','{method}','edge-{key}')")
    r['email']=f'grace{key}@example.co.ke'; r['phone']=phone
    return r
http('POST','/__mock/config',{'mpesaStk':'ok','brevo':'ok'})
run("update public.payment_gateway_methods set is_enabled=true where gateway_key in ('mpesa','card')")
for gk in ('mpesa','card'):
    ok,r=call('authenticated',f"select public.record_payment_provider_certification_360('{gk}','production','certified','{{\"successful_payment\":true,\"failed_payment\":true,\"duplicate_callback\":true,\"amount_reference_validation\":true,\"customer_return\":true,\"reconciliation\":true,\"evidence_reference\":\"UAT-test\"}}'::jsonb,'{{\"reference\":\"UAT-test\"}}'::jsonb,'test')",sub=OWNER)
    check(f'admin can record production certification for {gk} (the Certify button)', ok, r)
ok,g=call('service_role',"select public.get_payment_provider_release_gate_360('mpesa')"); check('release gate is now ready for M-Pesa', ok and g.get('ready'), g)
print('=== V. Real payment-initiate function (M-Pesa STK push)')
o=new_order('v1'); ORDER=o['order_id']; TOTAL=o['total']
body={'target_type':'order','target_id':ORDER,'email':o['email'],'phone':o['phone'],'payment_method':'mpesa','gateway_key':'mpesa','idempotency_key':'edge-pay-1'+RUN,'return_url':ORIGIN+'/payment-return'}
reset(); code,r=http('POST','/fn/payment-initiate',body)
check('initiate returns success', code==200 and isinstance(r,dict) and r.get('success'), (code,r)); print('   ->',json.dumps(r)[:260])
c=mock(); stk=[x for x in c if x['path'].startswith('/mpesa/stkpush')]; tok=[x for x in c if x['path'].startswith('/oauth')]
check('asked Safaricom for an OAuth token with Basic auth', len(tok)==1 and tok[0]['headers'].get('authorization','').startswith('Basic '), tok[:1])
check('sent exactly one STK push', len(stk)==1, len(stk))
if stk:
    b=stk[0]['body']; print('   STK body:',{k:b[k] for k in ('Amount','PhoneNumber','PartyA','PartyB','CallBackURL','AccountReference','TransactionType') if k in b})
    check('amount equals the order total in whole KES', b.get('Amount')==int(float(TOTAL)), b.get('Amount'))
    check('phone normalised to 2547XXXXXXXX', str(b.get('PhoneNumber'))=='254'+o['phone'][1:], b.get('PhoneNumber'))
    check('callback URL carries the secret', 'secret=cb-secret-123' in str(b.get('CallBackURL')), b.get('CallBackURL'))
    check('bearer token used on the STK push', stk[0]['headers'].get('authorization')=='Bearer MOCK-TOKEN')
CKO=q1(f"select provider_transaction_id from public.payment_transactions where order_id='{ORDER}' order by created_at desc limit 1")
check('checkout request id stored on the transaction', bool(CKO) and CKO.startswith('ws_CO_MOCK_'), CKO)
ATT=r.get('attempt_id'); TOKEN=r.get('access_token')
reset(); code,r2=http('POST','/fn/payment-initiate',body)
if isinstance(r2,dict) and r2.get('access_token'): TOKEN=r2['access_token']; ATT=r2.get('attempt_id',ATT)
check('double-click with the same key does NOT send a second STK push', len([x for x in mock() if 'stkpush' in x['path']])==0, (code,str(r2)[:120]))
code,r3=http('POST','/fn/payment-initiate',{**body,'idempotency_key':'edge-pay-2'+RUN})
check('a different key while one is in progress is refused', code>=400 or (isinstance(r3,dict) and not r3.get('success')), (code,str(r3)[:140])); print('   ->',str(r3)[:160])
print('=== W. payment-status (what the return page polls)')
code,st=http('POST','/fn/payment-status',{'attempt_id':ATT,'access_token':TOKEN})
check('status is pending before the customer pays', code==200 and st.get('status')=='pending', (code,st)); print('   ->',json.dumps(st)[:300])
check('NEW: status returns the order number for the tracking link', st.get('target_reference')==q1(f"select order_number from public.orders where id='{ORDER}'"), st.get('target_reference'))
code,bad=http('POST','/fn/payment-status',{'attempt_id':ATT,'access_token':'wrong-token'}); check('wrong access token reveals nothing', code>=400 or not (isinstance(bad,dict) and bad.get('status')), (code,str(bad)[:100]))
print('=== X. Safaricom callback')
MRID=q1(f"select provider_reference from public.payment_transactions where provider_transaction_id='{CKO}'")
badmr={'Body':{'stkCallback':{'MerchantRequestID':'MR-FORGED','CheckoutRequestID':CKO,'ResultCode':0,'ResultDesc':'ok','CallbackMetadata':{'Item':[{'Name':'Amount','Value':float(TOTAL)},{'Name':'MpesaReceiptNumber','Value':'FORGED1'}]}}}}
cb={'Body':{'stkCallback':{'MerchantRequestID':MRID,'CheckoutRequestID':CKO,'ResultCode':0,'ResultDesc':'The service request is processed successfully.','CallbackMetadata':{'Item':[{'Name':'Amount','Value':float(TOTAL)},{'Name':'MpesaReceiptNumber','Value':'QKX7TEST01'},{'Name':'TransactionDate','Value':20261119101500},{'Name':'PhoneNumber','Value':254712345678}]}}}}
code,r=http('POST','/fn/payment-callback?secret=wrong',cb,{'x-payment-provider':'mpesa'}); check('callback with the wrong secret is rejected', code in (401,403), (code,r))
check('order still unpaid after a forged callback', q1(f"select payment_status from public.orders where id='{ORDER}'")=='pending')
code,r=http('POST','/fn/payment-callback',cb,{'x-payment-provider':'mpesa'}); check('callback with NO secret is rejected', code in (401,403), (code,r))
code,r=http('POST','/fn/payment-callback?secret=cb-secret-123',badmr,{'x-payment-provider':'mpesa'}); check('callback with the right secret but a wrong merchant request id is rejected', code==409, (code,r))
check('order still unpaid after the mismatched callback', q1(f"select payment_status from public.orders where id='{ORDER}'")=='pending')
code,r=http('POST','/fn/payment-callback?secret=cb-secret-123',cb,{'x-payment-provider':'mpesa'}); check('genuine callback accepted (HTTP 200)', code==200, (code,r)); print('   ->',str(r)[:200])
check('order is paid', q1(f"select payment_status from public.orders where id='{ORDER}'")=='paid')
check('M-Pesa receipt number recorded', 'QKX7TEST01' in (q1(f"select coalesce(string_agg(provider_reference,','),'') from public.payment_transactions where order_id='{ORDER}'") or ''))
code,st=http('POST','/fn/payment-status',{'attempt_id':ATT,'access_token':TOKEN}); check('return page now sees successful', st.get('status')=='successful', st)
code,r=http('POST','/fn/payment-callback?secret=cb-secret-123',cb,{'x-payment-provider':'mpesa'}); check('Safaricom retry of the same callback is acknowledged with 200 (duplicate)', code==200 and (r.get('duplicate') is True) and q1(f"select count(*) from public.payment_transactions where order_id='{ORDER}' and status='successful'")=='1', (code,r))
print('=== Y. Failure paths')
o2=new_order('v2'); O2=o2['order_id']; b2={**body,'target_id':O2,'idempotency_key':'edge-pay-3'+RUN,'email':o2['email']}
http('POST','/__mock/config',{'mpesaStk':'reject'}); code,r=http('POST','/fn/payment-initiate',b2)
check('mistyped phone (Safaricom 400) is a clean failure with the provider reason', code>=400 and isinstance(r,dict) and r.get('success') is False and 'phone' in str(r.get('error','')).lower(), (code,str(r)[:200])); print('   ->',code,str(r)[:180])
print('   attempt/tx after rejection:',q1(f"select string_agg(a.status||'/'||t.status,',') from public.payment_attempts a join public.payment_transactions t on t.id=a.payment_transaction_id where t.order_id='{O2}'"))
http('POST','/__mock/config',{'mpesaStk':'ok'}); code,r=http('POST','/fn/payment-initiate',{**b2,'idempotency_key':'edge-pay-4'+RUN})
check('customer can correct the number and retry immediately', code==200 and r.get('success') and not r.get('initiation_uncertain'), (code,str(r)[:200]))
CKO2=q1(f"select provider_transaction_id from public.payment_transactions where order_id='{O2}' and provider_transaction_id is not null order by created_at desc limit 1")
cancel={'Body':{'stkCallback':{'MerchantRequestID':q1(f"select provider_reference from public.payment_transactions where provider_transaction_id='{CKO2}'"),'CheckoutRequestID':CKO2,'ResultCode':1032,'ResultDesc':'Request cancelled by user'}}}
code,r=http('POST','/fn/payment-callback?secret=cb-secret-123',cancel,{'x-payment-provider':'mpesa'}); check('customer cancelling the prompt is handled', code==200, (code,r))
check('order stays unpaid after a cancelled prompt', q1(f"select payment_status from public.orders where id='{O2}'")=='pending')
check('cancelled payment is marked failed', 'failed' in (q1(f"select string_agg(status,',') from public.payment_transactions where order_id='{O2}'") or ''))
code,r=http('POST','/fn/payment-callback?secret=cb-secret-123',cancel,{'x-payment-provider':'mpesa'}); check('duplicate cancel callback is harmless', code==200, (code,r))
code,r=http('POST','/fn/payment-initiate',{**b2,'idempotency_key':'edge-pay-5'+RUN}); check('customer can pay again after cancelling', code==200 and r.get('success'), (code,str(r)[:160]))
o3=new_order('v3'); b3={**body,'target_id':o3['order_id'],'idempotency_key':'edge-pay-6'+RUN,'email':o3['email']}
http('POST','/__mock/config',{'mpesaStk':'error'}); code,r=http('POST','/fn/payment-initiate',b3)
check('Safaricom 500 / timeout stays UNCERTAIN (customer may have been charged) and tells them not to pay twice', code==200 and r.get('initiation_uncertain') is True and 'do not start another payment' in r.get('message',''), (code,str(r)[:200]))
http('POST','/__mock/config',{'mpesaStk':'ok'}); code,r=http('POST','/fn/payment-initiate',{**b3,'idempotency_key':'edge-pay-7'+RUN})
check('and a second payment is blocked while that is unresolved', code>=400 and 'in progress' in str(r), (code,str(r)[:140]))
print(f"\n{sum(1 for _,c in results if c)}/{len(results)} checks passed")
