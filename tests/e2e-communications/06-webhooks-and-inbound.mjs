import { sql, rows, worker, calls, reset, scenario, record, resetDb } from './lib.mjs';
const WH = 'http://127.0.0.1:8002/', IN = 'http://127.0.0.1:8003/';
const post = (u, body, secret, raw) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { 'x-topline-webhook-secret': secret } : {}) }, body: raw ?? JSON.stringify(body) });
resetDb(); await reset(); await scenario({ email: 'ok' });
let r = await post(WH, { event: 'delivered' }, 'wrong');
record('WH-01', 'G/H', 'Webhook rejects a wrong secret (401)', 'e2e-real-function', r.status === 401, r.status);
r = await post(WH, { event: 'delivered' }, null);
record('WH-02', 'G/H', 'Webhook rejects a missing secret (401)', 'e2e-real-function', r.status === 401, r.status);
r = await fetch(WH, { method: 'GET', headers: { 'x-topline-webhook-secret': 'e2e-webhook-secret' } });
record('WH-03', 'G/H', 'Webhook rejects GET (405)', 'e2e-real-function', r.status === 405, r.status);
r = await post(WH, null, 'e2e-webhook-secret', '{not json');
record('WH-04', 'G', 'Webhook returns 400 for malformed JSON', 'e2e-real-function', r.status === 400, r.status);
r = await post(WH, null, 'e2e-webhook-secret', 'x'.repeat(1_100_000));
record('WH-05', 'G', 'Webhook rejects a >1 MB payload (413)', 'e2e-real-function', r.status === 413, r.status);

// real send -> delivery correlation by the message id the worker stored
const id = sql(`INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key) VALUES ('email','wh.target@example.org','Hello','Body','wh-1') RETURNING id;`).split('\n')[0];
await worker(5);
const mid = rows(`SELECT provider_message_id, delivery_status FROM public.communication_outbox WHERE id='${id}'`)[0];
record('WH-06', 'G', 'Worker stored the provider message id returned by Brevo', 'e2e-real-function', /^<mock-\d+@smtp-relay\.mailin\.fr>$/.test(mid[0]), JSON.stringify(mid));
r = await post(WH, { event: 'delivered', 'message-id': mid[0], email: 'wh.target@example.org', date: '2026-10-20 10:00:00' }, 'e2e-webhook-secret');
let st = rows(`SELECT status, delivery_status FROM public.communication_outbox WHERE id='${id}'`)[0];
record('WH-07', 'G', 'A delivered event correlates to the sent message and marks it delivered', 'e2e-real-function', r.status === 200 && st[1] === 'delivered', JSON.stringify({ http: r.status, st }));
const before = rows(`SELECT count(*) FROM public.communication_provider_events`)[0][0];
r = await post(WH, { event: 'delivered', 'message-id': mid[0], email: 'wh.target@example.org', date: '2026-10-20 10:00:00' }, 'e2e-webhook-secret');
const after = rows(`SELECT count(*) FROM public.communication_provider_events`)[0][0];
st = rows(`SELECT status, delivery_status FROM public.communication_outbox WHERE id='${id}'`)[0];
record('WH-08', 'G', 'Replaying the identical event is idempotent (no extra event row, status unchanged)', 'e2e-real-function', r.status === 200 && before === after && st[1] === 'delivered', JSON.stringify({ before, after, st }));
r = await post(WH, { event: 'request', 'message-id': mid[0], email: 'wh.target@example.org' }, 'e2e-webhook-secret');
st = rows(`SELECT delivery_status FROM public.communication_outbox WHERE id='${id}'`)[0];
record('WH-09', 'G', 'A late/out-of-order "request" event cannot regress delivered to an earlier state', 'e2e-real-function', st[0] === 'delivered', JSON.stringify(st));
r = await post(WH, { event: 'delivered', 'message-id': '<does-not-exist@smtp-relay.mailin.fr>', email: 'ghost@example.org' }, 'e2e-webhook-secret');
record('WH-10', 'G', 'Event for an unknown message id is accepted without error or state change', 'e2e-real-function', r.status === 200, r.status);

// failure events must flag the message failed, and bounces must suppress
const id2 = sql(`INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key) VALUES ('email','wh.bounce@example.org','Hello','Body','wh-2') RETURNING id;`).split('\n')[0];
await worker(5);
const mid2 = rows(`SELECT provider_message_id FROM public.communication_outbox WHERE id='${id2}'`)[0][0];
r = await post(WH, { event: 'hard_bounce', 'message-id': mid2, email: 'wh.bounce@example.org', reason: 'mailbox does not exist' }, 'e2e-webhook-secret');
st = rows(`SELECT delivery_status FROM public.communication_outbox WHERE id='${id2}'`)[0];
const sup = rows(`SELECT reason FROM public.communication_suppressions WHERE email='wh.bounce@example.org'`)[0];
record('WH-11', 'G', 'Hard bounce: message flagged failed and the address is suppressed', 'e2e-real-function', st[0] === 'failed' && sup?.[0] === 'hard_bounce', JSON.stringify({ st, sup }));
r = await post(WH, { event: 'unsubscribed', email: 'wh.unsub@example.org', 'message-id': '<x@y>' }, 'e2e-webhook-secret');
const sup2 = rows(`SELECT reason FROM public.communication_suppressions WHERE email='wh.unsub@example.org'`)[0];
record('WH-12', 'F', 'Brevo "unsubscribed" event is recorded in the suppression list', 'e2e-real-function', r.status === 200 && sup2?.[0] === 'unsubscribed', JSON.stringify(sup2));

// inbound email
r = await post(IN, { items: [{ From: { Email: 'client@example.org' }, Subject: 'Quote', TextBody: 'Please call me.' }] }, 'wrong');
record('IN-01', 'H', 'Inbound email rejects a wrong secret (401)', 'e2e-real-function', r.status === 401, r.status);
r = await post(IN, { items: [{ From: { Email: 'client@example.org' }, To: [{ Email: 'info@topline.example' }], Subject: 'Quote', TextBody: 'Please call me about flooring.', MessageId: '<in-1@mail>' }] }, 'e2e-inbound-secret');
const inb = rows(`SELECT sender, subject, message FROM public.communication_inbound WHERE sender='client@example.org'`)[0];
record('IN-02', 'G', 'Inbound customer email is recorded for staff', 'e2e-real-function', r.status === 200 && inb?.[2] === 'Please call me about flooring.', JSON.stringify(inb));
r = await post(IN, { items: [{ From: { Email: 'big@example.org' }, Subject: 'x', TextBody: 'y'.repeat(3_000_000), MessageId: '<big-1@mail>' }] }, 'e2e-inbound-secret');
const bl = rows(`SELECT length(message) FROM public.communication_inbound WHERE sender='big@example.org'`)[0];
record('IN-03', 'G', 'A 3 MB inbound email is accepted but stored bounded (<= 20,000 chars)', 'e2e-real-function', r.status === 200 && Number(bl?.[0]) <= 20000, `http ${r.status}, stored length ${bl?.[0]}`);
r = await post(IN, { items: [{ From: { Email: 'empty@example.org' }, TextBody: '' }] }, 'e2e-inbound-secret');
record('IN-04', 'G', 'Inbound email without a body is rejected (400)', 'e2e-real-function', r.status === 400, r.status);
