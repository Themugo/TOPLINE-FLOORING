import fs from 'node:fs';
import path from 'node:path';
const evidenceFile = process.env.TOPLINE_EMAIL_INBOX_EVIDENCE || 'artifacts/g13-email-deliverability/inbox-evidence.json';
if (!fs.existsSync(evidenceFile)) {
  console.error(`BLOCKED: evidence file not found: ${evidenceFile}`);
  process.exit(2);
}
const e = JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
const required = ['test_id','sent_at_utc','received_at_utc','mailbox_provider','folder','message_id','from_domain','authentication_results','reviewed_by'];
const missing = required.filter(k => !String(e[k] ?? '').trim());
const auth = String(e.authentication_results || '').toLowerCase();
const checks = {
  SPF: /spf=pass/.test(auth),
  DKIM: /dkim=pass/.test(auth),
  DMARC: /dmarc=pass/.test(auth),
  inbox_folder: String(e.folder).toLowerCase() === 'inbox',
  message_id: Boolean(e.message_id),
  sender_domain: String(e.from_domain || '').toLowerCase() === 'toplinefloorandwaterproofing.co.ke',
  timing: Number.isFinite(Date.parse(e.sent_at_utc)) && Number.isFinite(Date.parse(e.received_at_utc)) && Date.parse(e.received_at_utc) >= Date.parse(e.sent_at_utc),
};
if (missing.length) console.error(`Missing fields: ${missing.join(', ')}`);
for (const [name,pass] of Object.entries(checks)) console.log(`${pass?'PASS':'FAIL'} ${name}`);
if (missing.length || Object.values(checks).some(x=>!x)) {
  console.error('Inbox deliverability evidence NOT VERIFIED.');
  process.exit(1);
}
console.log('Inbox receipt evidence structurally verified. Human reviewer must confirm the original message and full headers in the mailbox.');
