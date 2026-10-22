import { sql, rows, rpc, userJwt, worker, calls, reset, scenario, record, resetDb } from './lib.mjs';
resetDb(); await reset(); await scenario({ email: 'ok', sms: 'ok', wa: 'ok' });
sql(`SET client_min_messages=warning; DELETE FROM auth.users; DELETE FROM public.customers;`);
sql(`INSERT INTO public.site_integration_configs(integration_key,channel,provider,public_config) VALUES ('communications.email','email','brevo','{"quotation_admin_email":"sales@topline.example"}') ON CONFLICT (integration_key) DO UPDATE SET public_config=EXCLUDED.public_config;`);
const id = crypto.randomUUID(), email = 'noise.test@example.org';
sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${id}','${email}','{"topline_customer_registration":true,"name":"Noise Test","phone":"0700456456","marketing_email_opt_in":false}'::jsonb, NULL); UPDATE auth.users SET email_confirmed_at=now() WHERE id='${id}';`);
const cid = rows(`SELECT customer_id FROM public.customer_portal_access WHERE auth_user_id='${id}'`)[0][0];
sql(`DELETE FROM public.communication_outbox; DELETE FROM public.communication_workflow_events;`);
const subjects = () => rows(`SELECT channel, coalesce(subject,message) FROM public.communication_outbox ORDER BY created_at`).map((r) => r[1].slice(0, 55));

// signed-in quotation: acknowledgement + staff alert only
const q = await rpc('submit_quotation_request', { p_name: 'Noise Test', p_email: email, p_phone: '0700456456', p_county: 'Nairobi', p_project_type: 'Flooring', p_service: 'Epoxy', p_message: 'Signed-in quote' }, userJwt(id, email));
const dedupe = rows(`SELECT left(dedupe_key, 17) FROM public.communication_outbox ORDER BY created_at`).map((r) => r[0]);
record('N-01', 'C', 'Signed-in quotation sends exactly the acknowledgement + staff alert (no extra "quotation is new")', 'e2e-db', dedupe.length === 2 && dedupe.every((k) => k === 'quotation-intake:'), JSON.stringify(subjects()));
const qid = q.body.quotation_id;
const flow = async (status) => { sql(`DELETE FROM public.communication_outbox;`); sql(`UPDATE public.quotations SET status='${status}' WHERE id='${qid}'`); return rows(`SELECT count(*) FROM public.communication_outbox`)[0][0]; };
const hidden = []; for (const s of ['contacted', 'negotiating', 'lost', 'won', 'converted']) { const n = await flow(s); if (n !== '0') hidden.push(`${s}:${n}`); }
record('N-02', 'C', 'Internal pipeline states (contacted, negotiating, lost, won, converted) send nothing to the customer', 'e2e-db', hidden.length === 0, hidden.length ? 'SENT: ' + hidden : 'none sent');
const shown = {}; for (const s of ['quoted', 'accepted', 'rejected']) shown[s] = Number(await flow(s));
record('N-03', 'C', 'Customer-meaningful quotation states (quoted, accepted, rejected) still notify (>=1 channel)', 'e2e-db', Object.values(shown).every((n) => n >= 1), JSON.stringify(shown));

// invoices
sql(`DELETE FROM public.communication_outbox;`);
const inv = sql(`INSERT INTO public.invoices(customer_id, invoice_number, customer_name, customer_email, customer_phone, subtotal, total_amount, due_date) VALUES ('${cid}','INV-N-1','Noise Test','${email}','0700456456',5000,5000,current_date+7) RETURNING id;`).split('\n')[0];
record('N-04', 'E', 'Creating a DRAFT invoice sends nothing to the customer', 'e2e-db', rows(`SELECT count(*) FROM public.communication_outbox`)[0][0] === '0', rows(`SELECT count(*) FROM public.communication_outbox`)[0][0]);
sql(`UPDATE public.invoices SET status='sent' WHERE id='${inv}'`);
const sentN = rows(`SELECT count(*) FROM public.communication_outbox`)[0][0];
await worker(10);
const ie = (await calls()).find((x) => x.kind === 'email');
record('N-05', 'E', 'Marking the invoice SENT notifies the customer; delivered email is clean', 'e2e-real-function', Number(sentN) >= 1 && !!ie && /sent/i.test(ie.subject) && !ie.text.includes('{{'), ie ? ie.subject : 'none');
await reset(); sql(`DELETE FROM public.communication_outbox;`);
sql(`UPDATE public.invoices SET status='paid', amount_paid=5000 WHERE id='${inv}'`);
record('N-06', 'E', 'Marking the invoice PAID notifies the customer', 'e2e-db', Number(rows(`SELECT count(*) FROM public.communication_outbox`)[0][0]) >= 1, subjects().join(' / '));
