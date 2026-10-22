import { sql, rows, rpc, rest, record, SERVICE, ANON, userJwt, worker } from './lib.mjs';
sql(`SET client_min_messages=warning; DELETE FROM public.orders; DELETE FROM public.quotations; DELETE FROM auth.users; DELETE FROM public.customers;`);
const uid = () => crypto.randomUUID();
const mkUser = (email, name, phone) => { const id = uid(); sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${id}','${email}','{"topline_customer_registration":true,"name":"${name}","phone":"${phone}","marketing_email_opt_in":false}'::jsonb, NULL); UPDATE auth.users SET email_confirmed_at=now() WHERE id='${id}';`); return id; };
const pid = sql(`INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('E2E Authz Tile','e2e-authz-tile',500,200,true,'active','box') ON CONFLICT (slug) DO UPDATE SET stock_quantity=200 RETURNING id;`).split('\n')[0];
const A = mkUser('alice.authz@example.org', 'Alice A', '0711900001'), B = mkUser('bob.authz@example.org', 'Bob B', '0722900002');
const ja = userJwt(A, 'alice.authz@example.org'), jb = userJwt(B, 'bob.authz@example.org');
const order = (jwt, name, email, phone, key) => rpc('create_secure_customer_order', { p_name: name, p_email: email, p_phone: phone, p_items: [{ product_id: pid, quantity: 2 }], p_notes: '', p_delivery_address: 'Nairobi', p_payment_method: 'mpesa', p_idempotency_key: key }, jwt);
const oa = await order(ja, 'Alice A', 'alice.authz@example.org', '0711900001', 'az-a'), ob = await order(jb, 'Bob B', 'bob.authz@example.org', '0722900002', 'az-b');
await rpc('submit_quotation_request', { p_name: 'Bob B', p_email: 'bob.authz@example.org', p_phone: '0722900002', p_message: "Bob's private quotation" }, jb);
const custA = rows(`SELECT customer_id FROM public.customer_portal_access WHERE auth_user_id='${A}'`)[0][0], custB = rows(`SELECT customer_id FROM public.customer_portal_access WHERE auth_user_id='${B}'`)[0][0];

// H-01 portal isolation
const pa = await rpc('get_customer_portal_data', {}, ja);
const aNums = (pa.body.orders || []).map((o) => o.order_number), bNum = ob.body.order_number;
record('H-01', 'H', "Customer A's portal contains A's order and none of B's orders/quotations", 'e2e-postgrest', aNums.includes(oa.body.order_number) && !aNums.includes(bNum) && (pa.body.quotations || []).length === 0 && pa.body.customer.id === custA, JSON.stringify({ aOrders: aNums.length, leaksB: aNums.includes(bNum) }));

// H-02 direct table access (RLS)
const t = async (path, jwt) => (await rest('GET', path, jwt)).body;
const oRows = await t('orders?select=id,customer_id', ja), cRows = await t('customers?select=id,email', ja);
record('H-02', 'H', 'Direct REST read of orders returns only the caller\'s rows', 'e2e-postgrest', Array.isArray(oRows) && oRows.every((r) => r.customer_id === custA), JSON.stringify(Array.isArray(oRows) ? oRows.length : oRows).slice(0, 80));
record('H-03', 'H', 'Direct REST read of customers cannot see other customers', 'e2e-postgrest', !Array.isArray(cRows) || cRows.every((r) => r.id === custA), JSON.stringify(Array.isArray(cRows) ? cRows.map((r) => r.email) : cRows).slice(0, 100));
const none = ['communication_outbox', 'staff_profiles', 'staff_role_assignments', 'brevo_marketing_sync_queue', 'communication_suppressions', 'payments'];
const leaks = []; for (const tb of none) { const b = await t(`${tb}?select=*&limit=1`, ja); if (Array.isArray(b) && b.length) leaks.push(tb); }
const ne = await t('notification_events?select=customer_id,audience&limit=100', ja);
const neOk = Array.isArray(ne) && ne.every((r) => r.customer_id === custA && r.audience !== 'staff');
record('H-04b', 'H', 'Customer sees only their own customer-facing notifications (never staff-audience events)', 'e2e-postgrest', neOk, JSON.stringify(Array.isArray(ne) ? ne.map((r) => r.audience) : ne));
record('H-04', 'H', 'Customer cannot read internal tables (outbox, staff, marketing queue, suppressions, payments)', 'e2e-postgrest', leaks.length === 0, leaks.length ? 'LEAKS: ' + leaks : 'none readable');

// H-05 forged identifiers
const f1 = await rpc('get_customer_communications_360', { p_customer_id: custB }, ja);
record('H-05', 'H', "Forged customer id: A cannot read B's communications via get_customer_communications_360", 'e2e-postgrest', f1.status >= 400 || (Array.isArray(f1.body) ? f1.body.length === 0 : !JSON.stringify(f1.body).includes('Bob')), `status ${f1.status} ${JSON.stringify(f1.body).slice(0, 100)}`);
const f2 = await rpc('update_customer_notification_preferences', { p_customer_id: custB, p_email_enabled: false, p_sms_enabled: false, p_whatsapp_enabled: false, p_marketing_email_enabled: true, p_marketing_sms_enabled: true }, ja);
const bPref = rows(`SELECT email_enabled, marketing_email_enabled FROM public.customer_notification_preferences WHERE customer_id='${custB}'`);
record('H-06', 'H', "Forged customer id: A cannot change B's notification preferences", 'e2e-postgrest', f2.status >= 400 && !(bPref[0] && bPref[0][1] === 't'), `status ${f2.status}; B marketing flag ${JSON.stringify(bPref)}`);
const f3 = await rpc('get_customer_payment_status', { p_target_type: 'order', p_target_id: ob.body.order_id }, ja);
record('H-07', 'H', "Forged order id: A cannot read the payment status of B's order", 'e2e-postgrest', f3.status >= 400 || JSON.stringify(f3.body).match(/not found|denied|unavailable/i) !== null, `status ${f3.status} ${JSON.stringify(f3.body).slice(0, 110)}`);
const f4 = await rest('POST', 'customer_notification_preferences', ja, { customer_id: custB, marketing_email_enabled: true });
record('H-08', 'H', "Direct insert into B's preferences is denied", 'e2e-postgrest', f4.status >= 400, `status ${f4.status}`);

// H-09 staff-only RPCs
const staffOnly = [['get_communications_release_gate_360', {}], ['retry_communication_outbox', { p_outbox_id: crypto.randomUUID() }], ['create_operational_data_export', {}], ['get_payment_provider_release_gate_360', { p_provider: 'mpesa' }]];
const open = []; for (const [fn, args] of staffOnly) { for (const [who, jwt] of [['customer', ja], ['anon', ANON]]) { const r = await rpc(fn, args, jwt); if (r.status === 200) open.push(`${who}:${fn}`); } }
record('H-09', 'H', 'Staff-only RPCs reject customers and anonymous callers', 'e2e-postgrest', open.length === 0, open.length ? 'OPEN: ' + open : 'all denied');

// H-10 anonymous
const anonReads = []; for (const tb of ['customers', 'orders', 'quotations', 'leads', 'communication_outbox', 'staff_profiles']) { const b = await t(`${tb}?select=*&limit=1`, ANON); if (Array.isArray(b) && b.length) anonReads.push(tb); }
const anonPost = await rest('POST', 'products', ANON, { name: 'Defaced', slug: 'defaced', price: 1 });
const anonPortal = await rpc('get_customer_portal_data', {}, ANON);
record('H-10', 'H', 'Anonymous: no private reads, cannot write products, cannot open the portal', 'e2e-postgrest', anonReads.length === 0 && anonPost.status >= 400 && anonPortal.status >= 400, JSON.stringify({ anonReads, postStatus: anonPost.status, portalStatus: anonPortal.status }));

// H-11 mass assignment via registration metadata
const M = uid();
sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${M}','mass@example.org','{"topline_customer_registration":true,"name":"Mallory","phone":"0700999999","role":"owner","is_admin":true,"staff":true,"permissions":["*"],"role_code":"owner"}'::jsonb, NULL); UPDATE auth.users SET email_confirmed_at=now() WHERE id='${M}';`);
const staffRows = rows(`SELECT (SELECT count(*) FROM public.staff_profiles WHERE user_id='${M}'), (SELECT count(*) FROM public.staff_role_assignments WHERE user_id='${M}')`)[0];
const sp = await rpc('get_communications_release_gate_360', {}, userJwt(M, 'mass@example.org'));
record('H-11', 'H', 'Registration metadata cannot create staff access or grant admin rights', 'e2e-postgrest', staffRows[0] === '0' && staffRows[1] === '0' && sp.status >= 400, JSON.stringify({ staffProfile: staffRows[0], roleAssignments: staffRows[1], staffRpcStatus: sp.status }));

// H-12 positive control: real staff can use the staff surface
const S = uid(); sql(`INSERT INTO auth.users(id,email) VALUES ('${S}','owner.authz@example.org'); INSERT INTO public.staff_profiles(user_id,display_name,is_active) VALUES ('${S}','Owner',true); INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '${S}', id FROM public.staff_roles WHERE code='owner';`);
const sr = await rpc('get_communications_release_gate_360', {}, userJwt(S, 'owner.authz@example.org'));
const so = await rest('GET', 'orders?select=id&limit=5', userJwt(S, 'owner.authz@example.org'));
record('H-12', 'H', 'Positive control: an active owner can reach the staff RPC and read orders', 'e2e-postgrest', sr.status === 200 && Array.isArray(so.body) && so.body.length >= 2, `rpc ${sr.status}, orders visible ${Array.isArray(so.body) ? so.body.length : so.status}`);
