import { sql, rows, worker, calls, reset, scenario, rpc, rest, record, resetDb, SERVICE, ANON, userJwt } from './lib.mjs';
resetDb(); await reset(); await scenario({ email: 'ok', sms: 'ok', wa: 'ok', contacts: 'ok' });
sql(`SET client_min_messages=warning; DELETE FROM public.orders; DELETE FROM auth.users; DELETE FROM public.customers;`);
const uid = () => crypto.randomUUID();
const signup = (id, email, meta) => sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${id}','${email}','${JSON.stringify(meta)}'::jsonb, NULL);`);
const confirm = (id) => sql(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${id}';`);
const reg = (name, phone, opt) => ({ topline_customer_registration: true, name, phone, company: null, marketing_email_opt_in: opt });
const q = (email) => rows(`SELECT action, status FROM public.brevo_marketing_sync_queue WHERE email='${email}' ORDER BY created_at, action`);

// ---- PATH A (database layer after GoTrue inserts the user)
const A = uid(); signup(A, 'amina.reg@example.org', reg('Amina Reg', '0711000111', true));
let cust = rows(`SELECT name, phone, email, notes FROM public.customers WHERE email='amina.reg@example.org'`);
record('A-01', 'A', 'Signup creates one pending customer profile from registration metadata', 'e2e-db', cust.length === 1 && cust[0][0] === 'Amina Reg' && /pending email verification/.test(cust[0][3]), JSON.stringify(cust));
record('A-02', 'A/F', 'Unverified signup with marketing opt-in is NOT enrolled in marketing', 'e2e-db', q('amina.reg@example.org').length === 0, JSON.stringify(q('amina.reg@example.org')));
const portalBefore = rows(`SELECT count(*) FROM public.customer_portal_access WHERE auth_user_id='${A}'`)[0][0];
record('A-03', 'A', 'Unverified user has no portal access link yet', 'e2e-db', portalBefore === '0', portalBefore);
const unverifiedJwt = userJwt(A, 'amina.reg@example.org');
const unv = await rpc('get_customer_portal_data', {}, unverifiedJwt);
record('A-04', 'A/H', 'Unverified account cannot load customer data', 'e2e-postgrest', unv.status >= 400 || !unv.body?.customer, `status ${unv.status} ${JSON.stringify(unv.body).slice(0, 120)}`);
confirm(A);
const portalAfter = rows(`SELECT count(*) FROM public.customer_portal_access WHERE auth_user_id='${A}'`)[0][0];
record('A-05', 'A', 'Email verification links the auth user to the customer record', 'e2e-db', portalAfter === '1', portalAfter);
const pd = await rpc('get_customer_portal_data', {}, userJwt(A, 'amina.reg@example.org'));
record('A-06', 'A', 'Verified customer loads their own profile via REST', 'e2e-postgrest', pd.status === 200 && pd.body?.customer?.email === 'amina.reg@example.org' && pd.body.customer.name === 'Amina Reg', JSON.stringify(pd.body).slice(0, 160));

// ---- PATH F: marketing consent through the real worker
record('F-01', 'F', 'Verification of an opted-in account queues exactly one subscribe', 'e2e-db', JSON.stringify(q('amina.reg@example.org')) === '[["subscribe","queued"]]', JSON.stringify(q('amina.reg@example.org')));
confirm(A); sql(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${A}'`);
record('F-02', 'F', 'Repeated verification updates do not queue a second subscribe', 'e2e-db', q('amina.reg@example.org').length === 1, JSON.stringify(q('amina.reg@example.org')));
await worker(10);
const cc = (await calls()).filter((x) => x.kind === 'contact');
record('F-03', 'F', 'Worker subscribes the verified opt-in to the configured Brevo list', 'e2e-real-function', cc.length === 1 && cc[0].method === 'POST' && cc[0].body.email === 'amina.reg@example.org' && JSON.stringify(cc[0].body.listIds) === '[7]' && q('amina.reg@example.org')[0][1] === 'synced', JSON.stringify(cc[0]?.body));

const N = uid(); signup(N, 'nonconsent@example.org', reg('Non Consent', '0722000222', false)); confirm(N);
record('F-04', 'F', 'Registration WITHOUT consent never enters marketing queue (even after verification)', 'e2e-db', q('nonconsent@example.org').length === 0, JSON.stringify(q('nonconsent@example.org')));

// opt out through the real customer RPC with the customer's own token
await reset();
const up = await rpc('update_customer_notification_preferences', { p_email_enabled: true, p_sms_enabled: true, p_whatsapp_enabled: true, p_marketing_email_enabled: false, p_marketing_sms_enabled: false }, userJwt(A, 'amina.reg@example.org'));
record('F-05', 'F', 'Customer opt-out via portal RPC queues an unsubscribe', 'e2e-postgrest', up.status === 200 && q('amina.reg@example.org').some((r) => r[0] === 'unsubscribe' && r[1] === 'queued'), JSON.stringify({ status: up.status, q: q('amina.reg@example.org') }));
await worker(10);
const uc = (await calls()).filter((x) => x.kind === 'contact');
record('F-06', 'F', 'Worker unlinks the contact from the marketing list', 'e2e-real-function', uc.length >= 1 && uc.some((x) => ['PUT', 'DELETE', 'POST'].includes(x.method) && JSON.stringify(x.body ?? '').match(/unlink|"listIds":\[\]/i) || /\/contacts\//.test(x.url)), JSON.stringify(uc.map((x) => [x.method, x.url.replace('https://api.brevo.com/v3', ''), x.body])).slice(0, 260));

// consent ordering: failing subscribe must not resurrect a later opt-out
const O = uid(); signup(O, 'ordering@example.org', reg('Order Test', '0733000333', true));
await scenario({ contacts: 'unavailable503' }); await reset(); confirm(O); await worker(10);
const afterFail = q('ordering@example.org');
await rpc('update_customer_notification_preferences', { p_email_enabled: true, p_sms_enabled: true, p_whatsapp_enabled: true, p_marketing_email_enabled: false, p_marketing_sms_enabled: false }, userJwt(O, 'ordering@example.org'));
sql(`UPDATE public.brevo_marketing_sync_queue SET next_attempt_at=now() WHERE email='ordering@example.org' AND status='queued'`);
await scenario({ contacts: 'ok' }); await reset(); await worker(10); await worker(10);
const cs = (await calls()).filter((x) => x.kind === 'contact' && JSON.stringify(x.body ?? '').includes('ordering@example.org') || /ordering%40example\.org/.test(x.url ?? ''));
const subscribesAfter = cs.filter((x) => x.method === 'POST' && x.body?.email === 'ordering@example.org').length;
record('F-07', 'F', 'Failed subscribe then opt-out: the stale subscribe is never re-sent (no resurrected consent)', 'e2e-real-function', subscribesAfter === 0 && !q('ordering@example.org').some((r) => r[0] === 'subscribe' && r[1] === 'queued'), JSON.stringify({ afterFirstFailure: afterFail, finalQueue: q('ordering@example.org'), subscribePostsAfterOptOut: subscribesAfter }));

// spam complaint via provider event -> disabled + blocked
const rr = await rpc('record_provider_delivery_event_worker', { p_provider: 'brevo', p_channel: 'email', p_event_type: 'spam', p_recipient: 'amina.reg@example.org' }, SERVICE);
const sup = rows(`SELECT reason FROM public.communication_suppressions WHERE email='amina.reg@example.org'`);
record('F-08', 'F', 'Spam complaint recorded in suppression list', 'e2e-postgrest', rr.status === 200 && sup[0]?.[0] === 'spam_complaint', JSON.stringify(sup));
await rpc('update_customer_notification_preferences', { p_email_enabled: true, p_sms_enabled: true, p_whatsapp_enabled: true, p_marketing_email_enabled: true, p_marketing_sms_enabled: false }, userJwt(A, 'amina.reg@example.org'));
await reset(); await worker(10);
record('F-09', 'F', 'Re-opt-in after a spam complaint does not re-enrol the address', 'e2e-real-function', (await calls()).filter((x) => x.kind === 'contact' && x.method === 'POST' && x.body?.email === 'amina.reg@example.org').length === 0, JSON.stringify(q('amina.reg@example.org').slice(-2)));

// ---- guest-then-register
sql(`SET client_min_messages=warning;`);
const pid = sql(`INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('E2E Reg Tile','e2e-reg-tile',900,50,true,'active','box') ON CONFLICT (slug) DO UPDATE SET stock_quantity=50 RETURNING id;`).split('\n')[0];
for (const k of ['g1', 'g2']) await rpc('create_secure_customer_order', { p_name: 'Guest Gita', p_email: 'gita@example.org', p_phone: '0744000444', p_items: [{ product_id: pid, quantity: 1 }], p_notes: '', p_delivery_address: 'Nairobi', p_payment_method: 'mpesa', p_idempotency_key: 'reg-' + k });
const gCust = rows(`SELECT count(*) FROM public.customers WHERE email='gita@example.org'`)[0][0];
const G = uid(); signup(G, 'gita@example.org', reg('Gita Registered', '0744000444', false)); confirm(G);
const gp = await rpc('get_customer_portal_data', {}, userJwt(G, 'gita@example.org'));
record('F-10', 'A', 'Guest who later registers (same email) sees their earlier orders in the portal', 'e2e-postgrest', gp.status === 200 && Array.isArray(gp.body?.orders) && gp.body.orders.length === 2, `customer rows ${gCust}; portal orders ${gp.body?.orders?.length}; status ${gp.status}`);

// F-11 quotation BEFORE registering shows up after registering
const qe = 'quote.first2@example.org';
await rpc('submit_quotation_request', { p_name: 'Quote First', p_email: qe, p_phone: '0766000777', p_county: 'Nairobi', p_project_type: 'Flooring', p_service: 'Epoxy', p_message: 'Submitted before registering' });
const QU = uid(); signup(QU, qe, reg('Quote First', '0766000777', false)); confirm(QU);
const qp = await rpc('get_customer_portal_data', {}, userJwt(QU, qe));
record('F-11', 'A/C', 'Quotation requested BEFORE registering appears in the portal after verification', 'e2e-postgrest', qp.body?.quotations?.length === 1, `portal quotations ${qp.body?.quotations?.length}`);

// F-12 returning guest (same email/phone, different case and phone format) reuses one customer record
const pid2 = sql(`INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('E2E Reuse Tile','e2e-reuse-tile',700,80,true,'active','box') ON CONFLICT (slug) DO UPDATE SET stock_quantity=80 RETURNING id;`).split('\n')[0];
const mkOrder = (name, email, phone, key) => rpc('create_secure_customer_order', { p_name: name, p_email: email, p_phone: phone, p_items: [{ product_id: pid2, quantity: 1 }], p_notes: '', p_delivery_address: 'Nairobi', p_payment_method: 'mpesa', p_idempotency_key: key });
await mkOrder('Wanjiku M', 'Wanjiku.M@Example.org', '0788111222', 'reuse-1');
await mkOrder('Wanjiku M', 'wanjiku.m@example.org', '+254788111222', 'reuse-2');
const reuse = rows(`SELECT count(*) FROM public.customers WHERE lower(email)='wanjiku.m@example.org'`)[0][0];
record('F-12', 'A', 'Returning guest (case/phone-format differences) reuses one customer record', 'e2e-postgrest', reuse === '1', `customer rows ${reuse}`);

// F-13 different people sharing an email (different phones) are NOT auto-linked
await mkOrder('Person One', 'shared@example.org', '0711555111', 'shared-1');
await mkOrder('Person Two', 'shared@example.org', '0722555222', 'shared-2');
const SH = uid(); signup(SH, 'shared@example.org', reg('Person One', '0711555111', false)); confirm(SH);
const shp = await rpc('get_customer_portal_data', {}, userJwt(SH, 'shared@example.org'));
const shLinks = rows(`SELECT count(*) FROM public.customer_portal_access WHERE auth_user_id='${SH}'`)[0][0];
record('F-13', 'A/H', 'Ambiguous email shared by different phones is not auto-linked (no cross-person exposure)', 'e2e-postgrest', shLinks === '0' && shp.status >= 400, `links ${shLinks}, portal status ${shp.status}`);

// F-14 signed-in customer's quotation is attached to their record
const sq = await rpc('submit_quotation_request', { p_name: 'Amina Reg', p_email: 'amina.reg@example.org', p_phone: '0711000111', p_county: 'Nairobi', p_project_type: 'Flooring', p_service: 'Epoxy', p_message: 'Submitted while signed in' }, userJwt(A, 'amina.reg@example.org'));
const cid = rows(`SELECT customer_id FROM public.quotations WHERE id='${sq.body?.quotation_id}'`)[0]?.[0];
const expected = rows(`SELECT customer_id FROM public.customer_portal_access WHERE auth_user_id='${A}'`)[0][0];
record('F-14', 'C', 'Quotation submitted while signed in is attached to the customer record', 'e2e-postgrest', cid === expected, `quotation.customer_id ${cid} expected ${expected}`);
