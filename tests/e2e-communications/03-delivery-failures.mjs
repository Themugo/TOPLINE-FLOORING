import { WORK } from './config.mjs';
import fs from 'node:fs';
import { sql, rows, worker, calls, reset, scenario, rpc, record, resetDb, SERVICE } from './lib.mjs';
const mk = (to, key, extra = '') => sql(`INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key${extra ? ',' + extra.split('=')[0] : ''}) VALUES ('email','${to}','Subject ${key}','Body ${key}','${key}'${extra ? ',' + extra.split('=')[1] : ''}) RETURNING id;`).split('\n')[0];
const st = (id) => rows(`SELECT status, delivery_status, attempt_count, (next_attempt_at > now() + interval '30 seconds') AS delayed, coalesce(error_message,''), provider_message_id IS NOT NULL FROM public.communication_outbox WHERE id='${id}'`)[0];
const sent = async (to) => (await calls()).filter((x) => x.kind === 'email' && (!to || x.to === to));
const fresh = async () => { resetDb(); await reset(); };

// G-01 permanent rejection
await fresh(); await scenario({ email: 'reject400' });
let id = mk('badaddr@example.org', 'g1'); await worker(5);
let s = st(id);
record('G-01', 'G', 'Provider 400 (bad recipient): fails immediately, no retry, never marked sent', 'e2e-real-function', s[0] === 'failed' && s[1] === 'failed' && s[2] === '1' && /Brevo 400/.test(s[4]), JSON.stringify(s));
await reset(); await worker(5);
record('G-02', 'G', 'A terminally failed message is never re-sent', 'e2e-real-function', (await calls()).length === 0, 'provider calls after re-run: ' + (await calls()).length);

// G-03.. retryable
for (const [code, scen] of [['401', 'unauthorized401'], ['429', 'rate429'], ['503', 'unavailable503']]) {
  await fresh(); await scenario({ email: scen });
  id = mk(`r${code}@example.org`, 'g-' + code); await worker(5); s = st(id);
  record(`G-03-${code}`, 'G', `Provider ${code}: stays queued with backoff, error recorded, not marked sent`, 'e2e-real-function', s[0] === 'queued' && s[1] === 'pending' && s[2] === '1' && s[3] === 't' && s[4].includes(code), JSON.stringify(s));
}

// G-04 retry exhaustion
await fresh(); await scenario({ email: 'unavailable503' });
id = mk('exhaust@example.org', 'g-exh'); sql(`UPDATE public.communication_outbox SET max_attempts=3 WHERE id='${id}'`);
for (let i = 0; i < 6; i++) { sql(`UPDATE public.communication_outbox SET next_attempt_at=now() WHERE id='${id}' AND status='queued'`); await worker(5); }
s = st(id);
const n = (await calls()).length;
record('G-04', 'G', 'Retry exhaustion: terminal failed after max_attempts (3), exactly 3 provider calls, error retained', 'e2e-real-function', s[0] === 'failed' && s[1] === 'failed' && s[2] === '3' && n === 3 && s[4].includes('503'), JSON.stringify({ s, providerCalls: n }));

// G-05 accepted but no message id
await fresh(); await scenario({ email: 'no_message_id' });
id = mk('noid@example.org', 'g-noid'); await worker(5); s = st(id);
record('G-05', 'G', 'Brevo accepts without messageId: message recorded sent but cannot be correlated (documented risk)', 'e2e-real-function', s[0] === 'sent' && s[5] === 'f', JSON.stringify(s));

// G-06 stale lease + prior accepted attempt (worker died after provider accepted)
await fresh(); await scenario({ email: 'ok' });
id = mk('crashed@example.org', 'g-stale'); sql(`UPDATE public.communication_outbox SET attempt_count=1, locked_at=now()-interval '30 minutes', last_attempt_at=now()-interval '30 minutes' WHERE id='${id}'`);
await rpc('record_communication_delivery_attempt_worker', { p_outbox_id: id, p_attempt_number: 1, p_provider: 'brevo', p_channel: 'email', p_request_id: crypto.randomUUID(), p_outcome: 'accepted', p_http_status: 201, p_provider_reference: '<prior@brevo>', p_response_payload: {} }, SERVICE);
const w = await worker(5); s = st(id);
record('G-06', 'G', 'Worker crash after provider accepted: stale lease reclaimed, message completed WITHOUT re-sending', 'e2e-real-function', (await calls()).length === 0 && s[0] === 'sent' && s[5] === 't', JSON.stringify({ s, providerCalls: (await calls()).length }));

// G-07 fresh lease not stolen
await fresh(); id = mk('leased@example.org', 'g-lease'); sql(`UPDATE public.communication_outbox SET attempt_count=1, locked_at=now()-interval '2 minutes' WHERE id='${id}'`);
await worker(5);
record('G-07', 'G', 'Message locked 2 minutes ago is not claimed by another worker', 'e2e-real-function', (await calls()).length === 0 && st(id)[0] === 'queued', JSON.stringify(st(id)));

// G-08 concurrent workers
await fresh(); await scenario({ email: 'ok' });
for (let i = 0; i < 30; i++) mk(`c${i}@example.org`, 'g-conc-' + i);
const [a, b] = await Promise.all([worker(30), worker(30)]);
const cs = await sent(); const uniq = new Set(cs.map((x) => x.to)).size;
record('G-08', 'G', 'Two concurrent workers over 30 messages: each sent exactly once (30 calls, 30 unique)', 'e2e-real-function', cs.length === 30 && uniq === 30 && rows(`SELECT count(*) FROM public.communication_outbox WHERE status='sent'`)[0][0] === '30', `calls ${cs.length}, unique ${uniq}, processed ${a.body.processed}+${b.body.processed}`);

// G-09 DB failure after provider accepted -> uncertain, not retried
await fresh(); await scenario({ email: 'ok' });
sql(`CREATE OR REPLACE FUNCTION public.e2e_block_sent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='sent' AND NEW.recipient='dbfail@example.org' THEN RAISE EXCEPTION 'simulated database failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER e2e_block_sent BEFORE UPDATE ON public.communication_outbox FOR EACH ROW EXECUTE FUNCTION public.e2e_block_sent();`);
id = mk('dbfail@example.org', 'g-dbfail'); await worker(5); s = st(id);
const att = rows(`SELECT outcome FROM public.communication_delivery_attempts WHERE outbox_id='${id}'`)[0]?.[0];
const trn = rows(`SELECT count(*) FROM public.communication_delivery_state_transitions WHERE outbox_id='${id}' AND event_type='worker.uncertain'`)[0][0];
await reset(); sql(`UPDATE public.communication_outbox SET next_attempt_at=now() WHERE id='${id}'`); await worker(5);
sql(`DROP TRIGGER e2e_block_sent ON public.communication_outbox; DROP FUNCTION public.e2e_block_sent();`);
record('G-09', 'G', 'Provider accepted but local completion failed: marked uncertain (failed/unknown), audited, NOT retried', 'e2e-real-function', s[0] === 'failed' && s[1] === 'unknown' && att === 'uncertain' && trn === '1' && (await calls()).length === 0, JSON.stringify({ s, att, trn, resendCalls: (await calls()).length }));

// G-10 ambiguous TIMEOUT after provider accepted (20s) -> is a duplicate sent on retry?
await fresh(); await scenario({ email: 'timeout_after_accept' });
id = mk('timeout@example.org', 'g-timeout'); const t0 = Date.now(); await worker(5); const secs = Math.round((Date.now() - t0) / 1000);
s = st(id); const firstCalls = (await sent('timeout@example.org')).length;
await scenario({ email: 'ok' }); sql(`UPDATE public.communication_outbox SET next_attempt_at=now() WHERE id='${id}' AND status='queued'`); await worker(5);
const total = (await sent('timeout@example.org')).length; const last = st(id);
const tc = (await sent('timeout@example.org'))[0];
record('G-10', 'G', 'Provider ACCEPTED the email but the response timed out: must not be re-sent', 'e2e-real-function', total === 1, JSON.stringify({ timeoutAfterSecs: secs, statusAfterTimeout: s.slice(0, 3), providerAcceptedCopies: total, finalStatus: last.slice(0, 2), httpIdempotencyKeyHeader: tc?.httpIdempotencyKey, emailHeaderOnly: tc?.emailHeaders }));

// G-11 dropped connection AFTER sending -> uncertain, no automatic re-send
await fresh(); await scenario({ email: 'reset_after_accept' });
id = mk('reset@example.org', 'g-reset'); await worker(5); s = st(id);
await scenario({ email: 'ok' }); sql(`UPDATE public.communication_outbox SET next_attempt_at=now() WHERE id='${id}' AND status='queued'`); await worker(5);
record('G-11', 'G', 'Connection reset after the request was sent: parked uncertain, not re-sent (1 provider copy)', 'e2e-real-function', s[0] === 'failed' && s[1] === 'unknown' && (await sent('reset@example.org')).length === 1, JSON.stringify({ s: s.slice(0, 3), copies: (await sent('reset@example.org')).length }));

// G-12 connection that never opened -> safe to retry and then succeeds
await fresh(); await scenario({ email: 'connect_fail' });
id = mk('connect@example.org', 'g-connect'); await worker(5); s = st(id);
await scenario({ email: 'ok' }); sql(`UPDATE public.communication_outbox SET next_attempt_at=now() WHERE id='${id}' AND status='queued'`); await worker(5);
record('G-12', 'G', 'Connection failed BEFORE sending: stays queued, retried, delivered once', 'e2e-real-function', s[0] === 'queued' && (await sent('connect@example.org')).length === 1 && st(id)[0] === 'sent', JSON.stringify({ afterFail: s.slice(0, 4), final: st(id).slice(0, 2), copies: (await sent('connect@example.org')).length }));

// G-13 SMS timeout after accept -> uncertain, no second SMS
await fresh(); await scenario({ sms: 'timeout_after_accept' });
const sid = sql(`INSERT INTO public.communication_outbox(channel,recipient,message,dedupe_key) VALUES ('sms','+254700111222','Hello','g-sms') RETURNING id;`).split('\n')[0];
await worker(5); s = st(sid);
await scenario({ sms: 'ok' }); sql(`UPDATE public.communication_outbox SET next_attempt_at=now() WHERE id='${sid}' AND status='queued'`); await worker(5);
const smsCopies = (await calls()).filter((x) => x.kind === 'sms').length;
record('G-13', 'G', 'SMS response timeout: parked uncertain, no second (billable) SMS', 'e2e-real-function', s[0] === 'failed' && s[1] === 'unknown' && smsCopies === 1, JSON.stringify({ s: s.slice(0, 3), smsCopies }));

// G-14 staff can deliberately retry an uncertain message
await fresh(); await scenario({ email: 'timeout_after_accept' }); id = mk('manual@example.org', 'g-manual'); await worker(5);
const staffUser = '00000000-0000-0000-0000-0000000000f1';
sql(`INSERT INTO auth.users(id,email) VALUES ('${staffUser}','staff@example.org') ON CONFLICT DO NOTHING; INSERT INTO public.staff_profiles(user_id,display_name,is_active) VALUES ('${staffUser}','Owner',true) ON CONFLICT DO NOTHING; INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '${staffUser}', id FROM public.staff_roles WHERE code='owner' ON CONFLICT DO NOTHING;`);
const { userJwt } = await import('./lib.mjs');
await scenario({ email: 'ok' }); await reset();
const rt = await rpc('retry_communication_outbox', { p_outbox_id: id }, userJwt(staffUser, 'staff@example.org'));
await worker(5);
record('G-14', 'G', 'Staff can deliberately re-queue an uncertain message; it is then delivered', 'e2e-real-function', rt.status === 200 && (await sent('manual@example.org')).length === 1 && st(id)[0] === 'sent', JSON.stringify({ rpc: rt.status, copies: (await sent('manual@example.org')).length, final: st(id).slice(0, 2) }));
const rt2 = await rpc('retry_communication_outbox', { p_outbox_id: id }, ANON_JWT());
record('G-15', 'H', 'Anonymous caller cannot re-queue messages', 'e2e-postgrest', rt2.status === 401 || rt2.status === 403, `status ${rt2.status}`);
function ANON_JWT() { return fs.readFileSync(`${WORK}/anon.jwt`, 'utf8').trim(); }
