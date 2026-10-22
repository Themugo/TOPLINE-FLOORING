import { WORK } from './config.mjs';
import { sql, rows, worker, calls, reset, scenario, rpc, SECRET, ANON, record, resetDb, W } from './lib.mjs';
resetDb(); await reset(); await scenario({ email: 'ok', sms: 'ok', wa: 'ok', contacts: 'ok' });
sql(`INSERT INTO public.site_integration_configs(integration_key,channel,provider,public_config) VALUES ('communications.email','email','brevo','{"quotation_admin_email":"sales@topline.example"}') ON CONFLICT (integration_key) DO UPDATE SET public_config=EXCLUDED.public_config;`);

// ---- WORKER AUTH
let r = await fetch(W, { method: 'POST', headers: { 'x-topline-worker-secret': 'wrong' }, body: '{}' });
record('W-01', 'G/H', 'Worker rejects wrong secret (401)', 'e2e-real-function', r.status === 401, `status ${r.status}`);
r = await fetch(W, { method: 'POST', body: '{}' });
record('W-02', 'G/H', 'Worker rejects missing secret (401)', 'e2e-real-function', r.status === 401, `status ${r.status}`);
r = await fetch(W, { method: 'GET', headers: { 'x-topline-worker-secret': SECRET } });
record('W-03', 'G/H', 'Worker rejects non-POST (405)', 'e2e-real-function', r.status === 405, `status ${r.status}`);
r = await fetch(W, { method: 'POST', headers: { 'x-topline-worker-secret': SECRET, 'content-length': '99999' }, body: 'x'.repeat(99999) });
record('W-04', 'G/H', 'Worker rejects oversized body (413)', 'e2e-real-function', r.status === 413, `status ${r.status}`);

// ---- PATH C: quotation (public anon RPC through PostgREST) -> outbox -> worker -> provider
const q = await rpc('submit_quotation_request', { p_name: 'Amina Wanjiru', p_email: 'amina@example.org', p_phone: '0712345678', p_county: 'Nairobi', p_project_type: 'Flooring', p_service: 'Epoxy', p_message: 'Need a quote for 40 sqm <b>warehouse</b> floor & coating.\nSecond line.', p_budget_range: '', p_timeline: '' });
record('C-01', 'C', 'Anonymous quotation submit succeeds via REST', 'e2e-postgrest', q.status === 200 && q.body?.success === true, JSON.stringify(q.body));
const qid = q.body?.quotation_id;
const ob = rows(`SELECT recipient, status FROM public.communication_outbox WHERE dedupe_key LIKE 'quotation-intake:${qid}:%' ORDER BY recipient`);
record('C-02', 'C', 'Customer acknowledgement + staff alert queued (2 rows)', 'e2e-db', ob.length === 2 && ob.some((x) => x[0] === 'amina@example.org') && ob.some((x) => x[0] === 'sales@topline.example'), JSON.stringify(ob));
const ev = rows(`SELECT count(*) FROM public.notification_events WHERE event_type='quotation.received' AND entity_id='${qid}'`);
record('C-03', 'C', 'Durable staff notification event recorded', 'e2e-db', ev[0][0] === '1', ev[0][0]);
const w1 = await worker(10);
record('C-04', 'C', 'Worker processes both emails', 'e2e-real-function', w1.status === 200 && w1.body.processed === 2 && w1.body.results.every((x) => x.status === 'sent'), JSON.stringify(w1.body?.results));
const cl = (await calls()).filter((x) => x.kind === 'email');
const cust = cl.find((x) => x.to === 'amina@example.org'), staff = cl.find((x) => x.to === 'sales@topline.example');
record('C-05', 'C', 'Provider received customer ack with real line breaks and RFQ reference', 'e2e-mocked-provider', !!cust && cust.text.includes('\n\n') && !cust.text.includes('\\n') && /RFQ-[A-F0-9]{8}/.test(cust.subject), cust ? cust.subject : 'none');
record('C-06', 'C', 'Staff alert HTML-escapes user-supplied markup', 'e2e-mocked-provider', !!staff && staff.html.includes('&lt;b&gt;warehouse&lt;/b&gt;') && !staff.html.includes('<b>warehouse'), staff ? staff.html.slice(0, 160) : 'none');
record('C-07', 'C', 'Sender, reply-to and API key used', 'e2e-mocked-provider', cust?.sender?.email === 'no-reply@topline.example' && cust?.replyTo?.email === 'info@topline.example' && cust?.apiKeyPresent, JSON.stringify({ s: cust?.sender, r: cust?.replyTo }));
const st = rows(`SELECT status, delivery_status, provider, provider_message_id IS NOT NULL FROM public.communication_outbox WHERE dedupe_key LIKE 'quotation-intake:${qid}:%'`);
record('C-08', 'C', 'Outbox marked sent with provider + message id', 'e2e-db', st.length === 2 && st.every((x) => x[0] === 'sent' && x[2] === 'brevo' && x[3] === 't'), JSON.stringify(st));
const atr = rows(`SELECT attempt_number, outcome, http_status, provider_reference IS NOT NULL, request_id IS NOT NULL, completed_at IS NOT NULL FROM public.communication_delivery_attempts ORDER BY started_at`);
record('C-09', 'C', 'One audited attempt per message: outcome accepted, HTTP 201, provider ref, request id, completed', 'e2e-db', atr.length === 2 && atr.every((x) => x[1] === 'accepted' && x[2] === '201' && x[3] === 't' && x[4] === 't' && x[5] === 't'), JSON.stringify(atr));
await reset();
const w2 = await worker(10);
record('C-10', 'C', 'Second worker run sends nothing (no duplicates)', 'e2e-real-function', w2.body.processed === 0 && (await calls()).length === 0, JSON.stringify(w2.body));
const dup = await rpc('submit_quotation_request', { p_name: 'Amina Wanjiru', p_email: 'amina@example.org', p_phone: '0712345678', p_county: 'Nairobi', p_project_type: 'Flooring', p_service: 'Epoxy', p_message: 'Need a quote for 40 sqm <b>warehouse</b> floor & coating.\nSecond line.', p_budget_range: '', p_timeline: '' });
record('C-11', 'C/D', 'Double-submit returns same record (no duplicate business record)', 'e2e-postgrest', dup.body?.duplicate === true && dup.body.quotation_id === qid && rows(`SELECT count(*) FROM public.quotations WHERE email='amina@example.org'`)[0][0] === '1', JSON.stringify(dup.body));
const bad = await rpc('submit_quotation_request', { p_name: 'A', p_email: 'not-an-email', p_phone: '1' });
record('C-12', 'C/D', 'Server rejects invalid name/email/phone with message', 'e2e-postgrest', bad.body?.success === false && /Invalid/.test(bad.body.error), JSON.stringify(bad.body));
let throttled = 0; for (let i = 0; i < 5; i++) { const t = await rpc('submit_quotation_request', { p_name: 'Spam ' + i, p_email: 'victim@example.org', p_phone: '07000000' + i + '0', p_message: 'm' + i }); if (t.body?.code === 'rate_limited') throttled++; }
record('C-13', 'C/D', 'Per-email throttle triggers after 3/hour (2 of 5 throttled)', 'e2e-postgrest', throttled === 2, `throttled ${throttled}`);
const d = (await rpc('submit_quotation_request', { p_name: 'Direct', p_email: 'x@example.org', p_phone: '0700000001' }));
const direct = await fetch('http://127.0.0.1:3000/quotations', { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Bypass', email: 'v@example.org', phone: '0700000009', message: 'x' }) });
record('C-14', 'C/H', 'Direct anonymous table insert (RPC bypass) is denied', 'e2e-postgrest', direct.status === 401 || direct.status === 403, `status ${direct.status}`);
