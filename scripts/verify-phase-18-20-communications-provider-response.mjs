import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
 'supabase/migrations/20260912180000_067_communications_provider_response_360.sql',
 'supabase/functions/deliver-communications/index.ts',
 'supabase/functions/communication-provider-webhook/index.ts',
 'supabase/functions/sms-inbound/index.ts',
 'supabase/functions/email-inbound/index.ts',
 'supabase/functions/whatsapp-webhook/index.ts',
 'src/pages/admin/communications.tsx',
 'docs/PHASES_18_20_COMMUNICATIONS_PROVIDER_RESPONSE_360.md',
];
for(const f of required) if(!fs.existsSync(path.join(root,f))) throw new Error(`Missing ${f}`);
const sql=fs.readFileSync(path.join(root,required[0]),'utf8');
const worker=fs.readFileSync(path.join(root,required[1]),'utf8');
const webhook=fs.readFileSync(path.join(root,required[2]),'utf8');
const inboundSms=fs.readFileSync(path.join(root,required[3]),'utf8');
const inboundEmail=fs.readFileSync(path.join(root,required[4]),'utf8');
const sync=fs.readFileSync(path.join(root,required[5]),'utf8');
const ui=fs.readFileSync(path.join(root,required[6]),'utf8');
for(const token of ['communication_inbound','communication_provider_events','record_provider_delivery_event_worker','record_inbound_communication_worker','get_customer_communications_360','whatsapp_enabled','queue_customer_notification_for_event']) if(!sql.includes(token)) throw new Error(`Missing DB communications contract: ${token}`);
for(const token of ['BREVO_REPLY_TO_EMAIL','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','sendWhatsApp','complete_communication_delivery_worker']) if(!worker.includes(token)) throw new Error(`Missing WhatsApp worker contract: ${token}`);
for(const token of ['COMMUNICATION_WEBHOOK_SECRET','record_provider_delivery_event_worker','record_inbound_communication_worker','Unauthorized']) if(!webhook.includes(token)) throw new Error(`Missing provider webhook security: ${token}`);
for(const token of ['AT_INBOUND_SECRET','record_inbound_communication_worker']) if(!inboundSms.includes(token)) throw new Error(`Missing SMS inbound contract: ${token}`);
for(const token of ['EMAIL_INBOUND_SECRET','record_inbound_communication_worker']) if(!inboundEmail.includes(token)) throw new Error(`Missing email inbound contract: ${token}`);
for(const token of ['WHATSAPP_VERIFY_TOKEN','record_provider_delivery_event_worker','record_inbound_communication_worker','hub.verify_token']) if(!sync.includes(token)) throw new Error(`Missing WhatsApp webhook contract: ${token}`);
for(const token of ['communication_inbound','last_provider_event','whatsapp']) if(!ui.includes(token)) throw new Error(`Missing communications UI contract: ${token}`);
if(/VITE_(BREVO|AT_|TOPLINE_WORKER|COMMUNICATION_)/.test(worker+webhook+inboundSms+inboundEmail+sync+ui)) throw new Error('Provider secret leaked into client configuration');
console.log('Communications Provider + Response 360 source verification PASSED.');
