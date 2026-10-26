import { sql, rows, worker, calls, reset, scenario, rpc, record, resetDb } from './lib.mjs';
resetDb(); await reset(); await scenario({ email: 'ok', sms: 'ok', wa: 'ok', contacts: 'ok' });
sql(`SET client_min_messages=warning; DELETE FROM auth.users; DELETE FROM public.customers;`);
sql(`INSERT INTO public.site_integration_configs(integration_key,channel,provider,public_config) VALUES ('communications.email','email','brevo','{"quotation_admin_email":"owner1@topline.example, owner2@topline.example; owner3@topline.example, not-an-email, OWNER1@topline.example"}') ON CONFLICT (integration_key) DO UPDATE SET public_config=EXCLUDED.public_config;`);
const outbox = () => rows(`SELECT recipient, subject, coalesce(reply_to,''), dedupe_key FROM public.communication_outbox ORDER BY dedupe_key, recipient`);

// ---- general contact message vs quotation request
const c = await rpc('submit_quotation_request', { p_name: 'Wanjiru Kamau', p_email: 'wanjiru@example.org', p_phone: '0712000111', p_county: 'General Inquiry', p_project_type: 'General Contact Message', p_service: 'Delivery question', p_message: 'Do you deliver to Nakuru?' });
const cid = c.body?.quotation_id; const cref = 'MSG-' + cid.replace(/-/g, '').slice(0, 8).toUpperCase();
let ob = outbox().filter((r) => r[3].startsWith(`quotation-intake:${cid}`));
const custRow = ob.find((r) => r[0] === 'wanjiru@example.org');
record('B-01', 'D', 'Contact message: buyer is told "We received your message (MSG-...)", not a quotation request', 'e2e-db', custRow?.[1] === `We received your message (${cref})`, custRow?.[1]);
const staffRows = ob.filter((r) => r[0].endsWith('@topline.example'));
record('B-02', 'D', 'Contact message: owner alert is "New website message MSG-... from <name>"', 'e2e-db', staffRows.length === 3 && staffRows.every((r) => r[1] === `New website message ${cref} from Wanjiru Kamau`), JSON.stringify(staffRows.map((r) => r[1])));
record('B-03', 'D', 'Alerts go to every valid owner address once (3 of 5 tokens: invalid and duplicate ignored)', 'e2e-db', JSON.stringify(staffRows.map((r) => r[0]).sort()) === JSON.stringify(['owner1@topline.example', 'owner2@topline.example', 'owner3@topline.example']) && JSON.stringify(staffRows.map((r) => r[3].replace(`quotation-intake:${cid}:`, '')).sort()) === JSON.stringify(['admin', 'admin-2', 'admin-3']), JSON.stringify(staffRows.map((r) => [r[0], r[3].split(':').pop()])));
record('B-04', 'D', 'Every owner alert replies directly to the buyer', 'e2e-db', staffRows.every((r) => r[2] === 'wanjiru@example.org') && custRow?.[2] === '', JSON.stringify({ staffReplyTo: staffRows.map((r) => r[2]), customerReplyTo: custRow?.[2] }));
const ev = rows(`SELECT title, metadata->>'contact_message', metadata->>'admin_recipients' FROM public.notification_events WHERE entity_id='${cid}' AND event_type='quotation.received'`)[0];
record('B-05', 'D', 'Admin notification feed labels it a website message and counts recipients', 'e2e-db', ev?.[0] === 'New website message' && ev[1] === 'true' && ev[2] === '3', JSON.stringify(ev));

// ---- quotation request
sql(`DELETE FROM public.communication_outbox;`);
const q = await rpc('submit_quotation_request', { p_name: 'Otieno Builders', p_email: 'otieno@example.org', p_phone: '0722000222', p_county: 'Mombasa', p_project_type: 'Industrial Flooring', p_service: 'Industrial Flooring', p_message: 'PHISH: verify your account at http://evil.example/login now', p_budget_range: '', p_timeline: 'Within 2 Weeks' });
const qid = q.body.quotation_id; const qref = 'RFQ-' + qid.replace(/-/g, '').slice(0, 8).toUpperCase();
const qm = rows(`SELECT recipient, subject FROM public.communication_outbox WHERE dedupe_key LIKE 'quotation-intake:${qid}:%' ORDER BY dedupe_key`);
const qc = qm.find((r) => r[0] === 'otieno@example.org'); const qs = qm.find((r) => r[0] === 'owner1@topline.example');
record('B-06', 'C', 'Quotation: buyer subject "We received your quotation request (RFQ-...)" and owner subject names project and buyer', 'e2e-db', qc?.[1] === `We received your quotation request (${qref})` && qs?.[1] === `New quotation request ${qref}: Industrial Flooring - Otieno Builders`, JSON.stringify([qc?.[1], qs?.[1]]));
const ackText = sql(`SELECT message FROM public.communication_outbox WHERE recipient='otieno@example.org'`);
record('B-07', 'C', 'Acknowledgement lists reference, project, location, timeline, follow-up link and how to add details', 'e2e-db', ackText.includes(qref) && ackText.includes('Industrial Flooring') && ackText.includes('Mombasa') && ackText.includes('Within 2 Weeks') && ackText.includes('https://toplineflooringandwaterproofing.co.ke/portal') && /reply to this email/i.test(ackText), ackText.slice(0, 120));
record('B-08', 'C/H', "Acknowledgement never echoes the buyer's free text (no attacker-written content or links sent to the typed address)", 'e2e-db', !ackText.includes('PHISH') && !ackText.includes('evil.example'), 'free text absent');
const staffText = sql(`SELECT message FROM public.communication_outbox WHERE recipient='owner1@topline.example' AND dedupe_key LIKE 'quotation-intake:${qid}:%'`);
record('B-09', 'C', 'Owner alert has full details, reply instruction and a link to the admin quotations page', 'e2e-db', staffText.includes('PHISH') && staffText.includes('Reply to this email to answer the buyer directly; your reply goes to otieno@example.org') && staffText.includes('https://toplineflooringandwaterproofing.co.ke/admin/quotations') && /Received: \d{2} \w{3} \d{4}, \d{2}:\d{2} \(EAT\)/.test(staffText), staffText.slice(-170));

// ---- real worker delivery: reply-to, branding, link safety
await reset(); await worker(10);
const cl = (await calls()).filter((x) => x.kind === 'email');
const sOwner = cl.find((x) => x.to === 'owner2@topline.example'), sBuyer = cl.find((x) => x.to === 'otieno@example.org');
record('B-10', 'E', 'Brevo receives replyTo = the buyer for owner alerts and the default support address for the buyer copy', 'e2e-mocked-provider', sOwner?.replyTo?.email === 'otieno@example.org' && sBuyer?.replyTo?.email === 'info@topline.example', JSON.stringify({ owner: sOwner?.replyTo, buyer: sBuyer?.replyTo }));
record('B-11', 'E', 'Buyer email is branded HTML (header, footer, responsive width) with a plain-text alternative and footer', 'e2e-mocked-provider', !!sBuyer && sBuyer.html.includes('<!doctype html>') && sBuyer.html.includes('width="600"') && sBuyer.html.includes('Topline Flooring &amp; Waterproofing') && sBuyer.html.includes('You are receiving this email because') && sBuyer.text.includes('--\nTopline Flooring & Waterproofing\nhttps://toplineflooringandwaterproofing.co.ke'), (sBuyer?.html || '').slice(0, 90));
record('B-12', 'E', 'Own-site links are clickable', 'e2e-mocked-provider', sBuyer.html.includes('<a href="https://toplineflooringandwaterproofing.co.ke/portal"'), 'portal link anchored');
record('B-13', 'E/H', 'A third-party link inside the buyer\'s text is NOT made clickable in the owner alert', 'e2e-mocked-provider', sOwner.html.includes('http://evil.example/login') && !/href="http:\/\/evil\.example/.test(sOwner.html), 'plain text only');
const delivered = rows(`SELECT count(*) FROM public.communication_outbox WHERE status='sent'`)[0][0];
record('B-14', 'E', 'All five messages (1 buyer + 3 owners + earlier contact set cleared) delivered with provider ids', 'e2e-db', delivered === '4', `sent ${delivered}`);

// ---- welcome email
const uid = () => crypto.randomUUID();
const meta = (name, phone) => JSON.stringify({ topline_customer_registration: true, name, phone, marketing_email_opt_in: false });
sql(`DELETE FROM public.communication_outbox;`);
const W = uid();
sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${W}','welcome.new@example.org','${meta('Amina Welcome', '0733111222')}'::jsonb, NULL);`);
record('B-15', 'A', 'No welcome email before the address is verified', 'e2e-db', rows(`SELECT count(*) FROM public.communication_outbox WHERE subject LIKE 'Welcome%'`)[0][0] === '0', 'none queued');
sql(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${W}';`);
let wl = rows(`SELECT recipient, subject, dedupe_key FROM public.communication_outbox WHERE subject LIKE 'Welcome%'`);
const wmsg = sql(`SELECT message FROM public.communication_outbox WHERE subject LIKE 'Welcome%'`);
const wcust = rows(`SELECT customer_id FROM public.customer_portal_access WHERE auth_user_id='${W}'`)[0][0];
record('B-16', 'A', 'Verification queues exactly one welcome email to the verified address (keyed to the customer)', 'e2e-db', wl.length === 1 && wl[0][0] === 'welcome.new@example.org' && wl[0][2] === `welcome:${wcust}`, JSON.stringify(wl));
record('B-17', 'A', 'Welcome explains what the account does and links to sign in and to request a quotation', 'e2e-db', /^Hello Amina Welcome,/.test(wmsg) && wmsg.includes('Follow your quotation requests') && wmsg.includes('/portal') && wmsg.includes('/quotation'), wmsg.slice(0, 80));
sql(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${W}';`);
record('B-18', 'A', 'Repeated verification updates never send a second welcome', 'e2e-db', rows(`SELECT count(*) FROM public.communication_outbox WHERE subject LIKE 'Welcome%'`)[0][0] === '1', 'still one');
await reset(); await worker(10);
const we = (await calls()).find((x) => x.to === 'welcome.new@example.org');
record('B-19', 'A', 'Worker delivers the welcome with a clickable portal link', 'e2e-real-function', !!we && we.subject === 'Welcome to TOPLINE Flooring & Waterproofing' && we.html.includes('<a href="https://toplineflooringandwaterproofing.co.ke/portal"'), we?.subject);
sql(`DELETE FROM public.communication_outbox;`);
const OLD = uid();
sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${OLD}','welcome.old@example.org','${meta('Old Account', '0733222333')}'::jsonb, NULL); UPDATE auth.users SET email_confirmed_at = now() - interval '3 days' WHERE id='${OLD}';`);
record('B-20', 'A', 'An account verified days ago and linked later gets no welcome', 'e2e-db', rows(`SELECT count(*) FROM public.customer_portal_access WHERE auth_user_id='${OLD}'`)[0][0] === '1' && rows(`SELECT count(*) FROM public.communication_outbox WHERE subject LIKE 'Welcome%'`)[0][0] === '0', 'linked, no welcome');
sql(`INSERT INTO public.communication_suppressions(email,reason,source) VALUES ('welcome.bounced@example.org','hard_bounce','test');`);
const BO = uid();
sql(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ('${BO}','welcome.bounced@example.org','${meta('Bounced Buyer', '0733333444')}'::jsonb, NULL); UPDATE auth.users SET email_confirmed_at=now() WHERE id='${BO}';`);
record('B-21', 'A/G', 'No welcome is queued for an address that previously bounced', 'e2e-db', rows(`SELECT count(*) FROM public.communication_outbox WHERE recipient='welcome.bounced@example.org'`)[0][0] === '0', 'suppressed');

// ---- volume guard exempts every owner-alert copy
sql(`DELETE FROM public.communication_outbox; INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key) SELECT 'email','owner2@topline.example','a','b','quotation-intake:vol-'||g||':admin-2' FROM generate_series(1,45) g;`);
record('B-22', 'G', 'Owner alert copies (":admin-2", ":admin-3") are exempt from the per-recipient volume guard', 'e2e-db', rows(`SELECT count(*) FROM public.communication_outbox WHERE status='queued'`)[0][0] === '45', rows(`SELECT status, count(*) FROM public.communication_outbox GROUP BY 1`).map((r) => r.join(':')).join(','));
