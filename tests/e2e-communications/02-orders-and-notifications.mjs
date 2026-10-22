import { sql, rows, worker, calls, reset, scenario, rpc, record, resetDb, SERVICE } from './lib.mjs';
resetDb(); sql(`SET client_min_messages=warning; DELETE FROM public.orders; DELETE FROM public.customers; DELETE FROM public.products WHERE slug LIKE 'e2e-%';`);
await reset(); await scenario({ email: 'ok', sms: 'ok', wa: 'ok', contacts: 'ok' });
const pid = sql(`INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('E2E Tile','e2e-tile',1500,100,true,'active','box') RETURNING id;`).split('\n')[0];

// ---- PATH E: guest order -> confirmation on all channels
const o = await rpc('create_secure_customer_order', { p_name: 'Brian Otieno', p_email: 'brian@example.org', p_phone: '0722333444', p_items: [{ product_id: pid, quantity: 3 }], p_notes: '', p_delivery_address: 'Nairobi', p_payment_method: 'mpesa', p_idempotency_key: 'e2e-order-1' });
record('E-01', 'E', 'Anonymous guest order created via REST (server-priced)', 'e2e-postgrest', o.status === 200 && o.body?.success === true && Number(o.body.total) === 4500, JSON.stringify(o.body).slice(0, 200));
const oid = o.body?.order_id;
const ob = rows(`SELECT channel, recipient, status FROM public.communication_outbox ORDER BY channel`);
record('E-02', 'E', 'Order confirmation queued on email, SMS and WhatsApp', 'e2e-db', ob.length === 3 && ['email', 'sms', 'whatsapp'].every((c) => ob.some((x) => x[0] === c)), JSON.stringify(ob));
const w = await worker(10);
record('E-03', 'E', 'Worker delivers all three channels', 'e2e-real-function', w.body?.processed === 3 && w.body.results.every((x) => x.status === 'sent'), JSON.stringify(w.body?.results));
const cl = await calls();
const em = cl.find((x) => x.kind === 'email'), sms = cl.find((x) => x.kind === 'sms'), wa = cl.find((x) => x.kind === 'whatsapp');
record('E-04', 'E', 'Recipients normalised per channel (email, +254 SMS, digits-only WhatsApp)', 'e2e-mocked-provider', em?.to === 'brian@example.org' && sms?.to === '+254722333444' && wa?.to === '254722333444', JSON.stringify([em?.to, sms?.to, wa?.to]));
const bodies = [em?.text, sms?.text, wa?.text].filter(Boolean);
record('E-05', 'E', 'No unrendered {{placeholders}}; customer name rendered', 'e2e-mocked-provider', bodies.length === 3 && bodies.every((t) => !t.includes('{{') && t.includes('Brian Otieno')), (em?.text || '').slice(0, 140));
const sref = rows(`SELECT channel, provider, provider_message_id IS NOT NULL FROM public.communication_outbox WHERE status='sent' ORDER BY channel`);
record('E-06', 'E', 'Each message stored with provider + provider message id', 'e2e-db', sref.length === 3 && sref.every((x) => x[2] === 't'), JSON.stringify(sref));
const smsRow = rows(`SELECT delivery_status, provider_reference IS NOT NULL FROM public.communication_outbox WHERE channel='sms'`)[0];
record('E-07', 'E', 'SMS outbox row carries a delivery status and provider reference after submission', 'e2e-db', !!smsRow && !!smsRow[0] && smsRow[1] === 't', JSON.stringify(smsRow));

// status change
await reset();
sql(`UPDATE public.orders SET status='processing' WHERE id='${oid}';`);
const n1 = rows(`SELECT count(*) FROM public.communication_outbox WHERE status='queued'`)[0][0];
record('E-08', 'E', 'Order status change queues a new notification on every channel', 'e2e-db', n1 === '3', `queued ${n1}`);
await worker(10);
const sc = (await calls()).find((x) => x.kind === 'email');
record('E-09', 'E', 'Status notification renders {{status}} and has no leftover placeholders', 'e2e-mocked-provider', !!sc && /processing/.test(sc.text) && !sc.text.includes('{{') && /processing/.test(sc.subject), sc ? sc.subject : 'none');
await reset();
sql(`UPDATE public.orders SET status='processing', notes='touch' WHERE id='${oid}';`);
const n2 = rows(`SELECT count(*) FROM public.communication_outbox WHERE status='queued'`)[0][0];
record('E-10', 'E', 'Re-saving the same status does not send a duplicate notification', 'e2e-db', n2 === '0', `queued ${n2}`);

// preferences
const cid = rows(`SELECT customer_id FROM public.orders WHERE id='${oid}'`)[0][0];
sql(`INSERT INTO public.customer_notification_preferences(customer_id,sms_enabled) VALUES ('${cid}',false) ON CONFLICT (customer_id) DO UPDATE SET sms_enabled=false;`);
sql(`UPDATE public.orders SET status='confirmed' WHERE id='${oid}';`);
const ch = rows(`SELECT channel FROM public.communication_outbox WHERE status='queued' ORDER BY channel`).map((x) => x[0]);
record('E-11', 'E', 'Customer SMS opt-out is honoured (email + WhatsApp only)', 'e2e-db', JSON.stringify(ch) === '["email","whatsapp"]', JSON.stringify(ch));

// suppression at send time
const rr = await rpc('record_provider_delivery_event_worker', { p_provider: 'brevo', p_channel: 'email', p_event_type: 'hard_bounce', p_recipient: 'brian@example.org' }, SERVICE);
await reset(); const w3 = await worker(10);
const emailsSent = (await calls()).filter((x) => x.kind === 'email').length;
const cancelled = rows(`SELECT count(*) FROM public.communication_outbox WHERE channel='email' AND status='cancelled'`)[0][0];
record('E-12', 'G', 'Hard-bounced address: queued email cancelled at send time, provider never called', 'e2e-real-function', emailsSent === 0 && Number(cancelled) >= 1, `emails sent ${emailsSent}, cancelled ${cancelled}`);

// every notification rule renders cleanly
const rules = rows(`SELECT event_type FROM public.notification_rules WHERE enabled ORDER BY 1`).map((x) => x[0]);
sql(`DELETE FROM public.communication_suppressions;`); sql(`DELETE FROM public.communication_outbox;`);
let bad = [];
for (const ev of rules) { await rpc('queue_customer_notification_for_event', { p_event_type: ev, p_entity_id: oid, p_customer_id: cid, p_status: 'in_review' }, SERVICE); }
const leftovers = rows(`SELECT count(*) FILTER (WHERE message LIKE '%{{%' OR subject LIKE '%{{%'), count(*) FROM public.communication_outbox`)[0];
record('E-13', 'E', `All ${rules.length} notification rules render without leftover placeholders`, 'e2e-db', leftovers[0] === '0' && Number(leftovers[1]) > 0, `unrendered ${leftovers[0]} of ${leftovers[1]} messages`);
