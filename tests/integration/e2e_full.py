import sys,json,re; sys.path.insert(0,'/tmp/dbtest')
from h import *
OWNER='11111111-1111-1111-1111-111111111111'; DRIVER='22222222-2222-2222-2222-222222222222'; FIN='33333333-3333-3333-3333-333333333333'
def q1(sql):
    rc,out,err=run(sql); l=last(out); return l[-1] if l else None
def call(role,sql,sub=None):
    rc,out,err=run(sql,role=role,sub=sub)
    if rc!=0: return False,(err.split('\n')[0].replace('ERROR:  ','') if err else out)
    l=last(out)
    try: return True,json.loads(l[-1])
    except Exception: return True,(l[-1] if l else None)
def outbox(like): return int(q1(f"select count(*) from public.communication_outbox where subject ilike '{like}' or message ilike '{like}'"))
# ---------- seed
run(f"""INSERT INTO auth.users(id,email) VALUES ('{OWNER}','owner@topline.test'),('{DRIVER}','driver@topline.test'),('{FIN}','finance@topline.test') ON CONFLICT DO NOTHING;
INSERT INTO public.staff_profiles(user_id,display_name,phone,is_active) VALUES ('{OWNER}','Test Owner','0700000001',true),('{DRIVER}','Peter Driver','0700000002',true),('{FIN}','Fin User','0700000003',true) ON CONFLICT DO NOTHING;
INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '{OWNER}',id FROM public.staff_roles WHERE code='owner' ON CONFLICT DO NOTHING;
INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '{DRIVER}',id FROM public.staff_roles WHERE code='staff' ON CONFLICT DO NOTHING;
INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '{FIN}',id FROM public.staff_roles WHERE code='finance' ON CONFLICT DO NOTHING;
INSERT INTO public.categories(name,slug) VALUES ('Flooring','flooring') ON CONFLICT DO NOTHING;
INSERT INTO public.products(name,slug,price,stock_quantity,in_stock,is_active,status) VALUES ('Epoxy Floor Kit','epoxy-floor-kit',2000,50,true,true,'active') ON CONFLICT DO NOTHING;
INSERT INTO public.delivery_zones(zone_name) VALUES ('Nairobi CBD') ON CONFLICT DO NOTHING;""")
PROD=q1("select id from public.products where slug='epoxy-floor-kit'"); ZONE=q1("select id from public.delivery_zones limit 1")
print('=== A. Customer places the order (anonymous browser)')
items=json.dumps([{"product_id":PROD,"quantity":2}])
ok,r=call('anon',f"select public.create_secure_customer_order('Jane Wanjiru','jane@example.co.ke','0712345678','{items}'::jsonb,'',NULL,'{ZONE}','Mombasa Rd, Nairobi','mpesa','k-1')")
check('order created by an anonymous customer', ok and r.get('success'), r)
ORDER=r['order_id']; check('server priced the order (2 x 2000)', float(r['total'])==4000, r)
ok,r2=call('anon',f"select public.create_secure_customer_order('Jane Wanjiru','jane@example.co.ke','0712345678','{items}'::jsonb,'',NULL,'{ZONE}','Mombasa Rd, Nairobi','mpesa','k-1')")
check('double-submit with the same key returns the same order (no duplicate)', ok and r2.get('order_id')==ORDER, r2)
check('stock reserved but not yet deducted', q1("select stock_quantity from public.products where slug='epoxy-floor-kit'")=='50' and q1(f"select status from public.inventory_reservations where order_id='{ORDER}' limit 1")=='reserved')
ok,e=call('anon',f"select public.create_secure_customer_order('X','x@x.co','0712345678','[{{\"product_id\":\"{PROD}\",\"quantity\":999}}]'::jsonb,'',NULL,NULL,NULL,'mpesa','k-big')")
check('ordering more than is in stock is refused', not ok, e)
print('=== B. Payment (payment-initiate + M-Pesa callback)')
ok,a=call('service_role',f"select public.create_payment_attempt_atomic_360('order','{ORDER}','mpesa','mpesa','mpesa',4000,'KES','254712345678','pay-1','{'a'*64}',NULL)")
check('payment attempt reserved', ok and a.get('success'), a); TX=a['payment_transaction_id']
ok,a2=call('service_role',f"select public.create_payment_attempt_atomic_360('order','{ORDER}','mpesa','mpesa','mpesa',4000,'KES','254712345678','pay-2','{'b'*64}',NULL)")
check('second parallel attempt blocked (payment_in_progress)', ok and a2.get('reason')=='payment_in_progress', a2)
ok,e=call('authenticated',f"select public.create_payment_attempt_atomic_360('order','{ORDER}','mpesa','mpesa','mpesa',4000,'KES','254712345678','pay-3','{'c'*64}',NULL)",sub=OWNER)
check('even a logged-in browser user cannot create payment attempts', not ok, e)
ok,u=call('service_role',f"update public.payment_transactions set provider_transaction_id='CKO-1' where id='{TX}' returning id")
check('payment-initiate can store the M-Pesa checkout id', ok, u)
ok,r=call('service_role',f"select public.apply_customer_payment_provider_event('mpesa','evt-bad','stk_callback','successful',3999,'KES','{ORDER}',NULL,'CKO-1','REF-1','{{}}'::jsonb)")
check('callback with the wrong amount is not accepted', q1(f"select payment_status from public.orders where id='{ORDER}'")!='paid', r)
ok,r=call('service_role',f"select public.apply_customer_payment_provider_event('mpesa','evt-ok','stk_callback','successful',4000,'KES','{ORDER}',NULL,'CKO-1','REF-1','{{}}'::jsonb)")
check('correct callback accepted', ok and r.get('success'), r)
check('order is now paid', q1(f"select payment_status from public.orders where id='{ORDER}'")=='paid')
check('stock deducted (50 -> 48)', q1("select stock_quantity from public.products where slug='epoxy-floor-kit'")=='48')
ok,r=call('service_role',f"select public.apply_customer_payment_provider_event('mpesa','evt-ok','stk_callback','successful',4000,'KES','{ORDER}',NULL,'CKO-1','REF-1','{{}}'::jsonb)")
check('replayed callback is harmless', ok, r)
check('exactly one successful payment', q1(f"select count(*) from public.payment_transactions where order_id='{ORDER}' and status='successful'")=='1')
print('=== C. Fulfilment and delivery (staff)')
ok,e=call('authenticated',f"select public.mark_order_ready_for_fulfillment('{ORDER}')",sub=DRIVER)
check('a driver (no orders permission) cannot mark an order ready', not ok, e)
ok,r=call('authenticated',f"select public.mark_order_ready_for_fulfillment('{ORDER}')",sub=OWNER)
check('owner marks the paid order ready -> delivery created', ok, r)
DEL=q1(f"select id from public.deliveries where order_id='{ORDER}'"); check('delivery row exists', bool(DEL))
ok,r=call('authenticated',f"select public.dispatch_order_delivery('{DEL}')",sub=OWNER)
check('dispatch refused without an assigned driver', not ok, r)
ok,r=call('authenticated',f"select public.update_order_delivery_address('{ORDER}','Kilimani, Argwings Kodhek Rd, Nairobi')",sub=OWNER)
check('NEW: staff can set the delivery address', ok and r.get('success'), r)
check('address copied to the pending delivery', q1(f"select delivery_address from public.deliveries where id='{DEL}'").startswith('Kilimani'))
ok,e=call('authenticated',f"select public.update_order_delivery_address('{ORDER}','Kilimani')",sub=OWNER); check('too-short address refused', not ok, e)
ok,e=call('authenticated',f"select public.update_order_delivery_address('{ORDER}','Somewhere long enough')",sub=DRIVER); check('driver cannot edit addresses', not ok, e)
ok,d=call('authenticated',"select public.get_active_delivery_drivers()",sub=OWNER)
check('driver list contains the active staff member', ok and any(x['user_id']==DRIVER for x in d), d)
ok,r=call('authenticated',f"select public.assign_delivery_driver('{DEL}','{DRIVER}')",sub=OWNER); check('driver assigned', ok, r)
ok,r=call('authenticated',f"select public.dispatch_order_delivery('{DEL}')",sub=OWNER); check('dispatch succeeds with driver + address + payment', ok, r)
ok,e=call('authenticated',f"select public.update_order_delivery_address('{ORDER}','Another address entirely')",sub=OWNER)
check('address locked once dispatched', not ok, e)
ok,r=call('authenticated',f"select public.advance_delivery_in_transit('{DEL}')",sub=OWNER); check('moved to in transit', ok, r)
tr=q1(f"select (public.track_order_public((select order_number from public.orders where id='{ORDER}'),'0712345678'))::text") if False else None
ok,r=call('authenticated',f"select public.complete_order_delivery('{DEL}','Jane Wanjiru',NULL,'Left with reception')",sub=OWNER); check('delivery completed with recipient', ok, r)
check('order completed after delivery', q1(f"select status from public.orders where id='{ORDER}'")=='completed', q1(f"select status from public.orders where id='{ORDER}'"))
print('  delivery notifications queued:',outbox('%deliver%'),'| order notifications:',outbox('%order%'))
print('=== D. Refund')
ok,e=call('authenticated',f"select public.create_order_refund_request('{ORDER}',5000,'too much','rk-1')",sub=FIN); check('refund above the paid amount refused', not ok, e)
ok,rr=call('authenticated',f"select public.create_order_refund_request('{ORDER}',500,'Damaged tin','rk-2')",sub=FIN); check('finance requests a partial refund', ok and rr.get('success'), rr)
RF=rr['refund_id'] if ok and isinstance(rr,dict) else None
ok,rr2=call('authenticated',f"select public.create_order_refund_request('{ORDER}',500,'Damaged tin','rk-2')",sub=FIN); check('same refund key replays instead of duplicating', ok and rr2.get('refund_id')==RF, rr2)
before=outbox('%refund%')
ok,r=call('authenticated',f"select public.complete_order_refund('{RF}',true,'MPESA-B2C-9','mpesa','sent')",sub=FIN); check('refund marked paid', ok, r)
check('order stays PAID after a partial refund', q1(f"select payment_status from public.orders where id='{ORDER}'")=='paid', q1(f"select payment_status from public.orders where id='{ORDER}'"))
check('NEW: customer notified that the refund was paid', outbox('%refund%')>before, f'before={before} after={outbox("%refund%")}')
ok,r=call('authenticated',"select public.reconcile_order_payment_totals(NULL)",sub=FIN); 
check('NEW: reconcile button keeps the order paid after a partial refund', ok and q1(f"select payment_status from public.orders where id='{ORDER}'")=='paid', q1(f"select payment_status from public.orders where id='{ORDER}'"))
ok,r=call('authenticated',f"select public.complete_order_refund('{RF}',true,'again','mpesa','')",sub=FIN); print('  completing an already-completed refund ->',ok,str(r)[:100])
json.dump({'order':ORDER,'results':results},open('/tmp/dbtest/state.json','w'))
print(f"\n{sum(1 for _,c in results if c)}/{len(results)} checks passed")
