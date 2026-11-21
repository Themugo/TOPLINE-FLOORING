import sys,json,time; sys.path.insert(0,'/tmp/dbtest')
exec(open('/tmp/dbtest/edge_e2e.py').read().split("run(\"update public.payment_gateway_methods")[0])
o=new_order('d'); ORDER=o['order_id']
ok,a=call('service_role',f"select public.create_payment_attempt_atomic_360('order','{ORDER}','mpesa','mpesa','mpesa',2000,'KES','254712345678','dl-{RUN}','{'q'*64}',NULL)"); TX=a['payment_transaction_id']
call('service_role',f"update public.payment_transactions set provider_transaction_id='CKO-D{RUN}' where id='{TX}' returning id")
ok,r=call('service_role',f"select public.apply_customer_payment_provider_event('mpesa','evt-d{RUN}','stk_callback','successful',2000,'KES','{ORDER}',NULL,'CKO-D{RUN}','REF-D{RUN}','{{}}'::jsonb)"); check('paid', ok and r.get('success'), r)
call('authenticated',f"select public.mark_order_ready_for_fulfillment('{ORDER}')",sub=OWNER)
DEL=q1(f"select id from public.deliveries where order_id='{ORDER}'")
for sql in (f"select public.assign_delivery_driver('{DEL}','{DRIVER}')",f"select public.dispatch_order_delivery('{DEL}')",f"select public.advance_delivery_in_transit('{DEL}')",f"select public.complete_order_delivery('{DEL}','Grace Njeri',NULL,'ok')"):
    call('authenticated',sql,sub=OWNER)
em=o['email']
rows=q1(f"select string_agg(subject, ' ## ' order by created_at) from public.communication_outbox where recipient='{em}' and subject ilike '%delivery%'")
print('delivery emails for this order:'); [print('  -',x) for x in (rows or '').split(' ## ')]
n=len((rows or '').split(' ## ')) if rows else 0
check('exactly 3 delivery emails (out for delivery, on its way, delivered)', n==3, n)
check('no raw status values leak (in_transit / pending / processing)', not any(w in (rows or '') for w in ('in_transit','pending','processing')), rows)
check('plain language used', all(p in (rows or '') for p in ('out for delivery','on its way to you','delivered')), rows)
body=q1(f"select replace(message,E'\\n',' / ') from public.communication_outbox where recipient='{em}' and subject ilike '%on its way%' limit 1"); print('  body:',body)
print(f"{sum(1 for _,c in results if c)}/{len(results)}")
