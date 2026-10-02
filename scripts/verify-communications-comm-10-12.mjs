import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const fail=(m)=>{throw new Error(m)};
const ok=(m)=>console.log(`PASS ${m}`);
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql'));
const mig=migrations.find(f=>f.startsWith('20261002170000_communications_comm_10_12_'));
if(!mig) fail('COMM-10-12 migration missing');
const sql=read(`supabase/migrations/${mig}`);
for(const x of ['communication_conversations','ensure_communication_conversation_worker','queue_communication_conversation_reply','get_communication_conversations_360','update_communication_conversation_360']) sql.includes(x)?ok(`COMM-10 ${x} contract present`):fail(`COMM-10 missing ${x}`);
for(const x of ["deliver_communications","automation_job_runs","get_communications_worker_certification_360","timed_out"]) sql.includes(x)?ok(`COMM-11 ${x} contract present`):fail(`COMM-11 missing ${x}`);
for(const x of ['communication_provider_activation','get_communication_provider_activation_360','database_does_not_store_provider_credentials']) sql.includes(x)?ok(`COMM-12 ${x} contract present`):fail(`COMM-12 missing ${x}`);
const scheduler=read('supabase/functions/operations-scheduler/index.ts');
for(const x of ['deliver_communications','start_automation_job','finish_automation_job','x-topline-worker-secret']) scheduler.includes(x)?ok(`Scheduler ${x}`):fail(`Scheduler missing ${x}`);
const readiness=read('supabase/functions/communication-provider-readiness/index.ts');
for(const x of ['TOPLINE_WORKER_SECRET','constantTimeEqual','configured','credentials_exposed']) readiness.includes(x)?ok(`COMM-12 readiness ${x}`):fail(`COMM-12 readiness missing ${x}`);
const delivery=read('supabase/functions/deliver-communications/index.ts');
for(const x of ['TOPLINE_WORKER_SECRET','claim_communication_outbox_worker','complete_communication_delivery_worker','fail_communication_delivery_worker','mark_communication_delivery_uncertain_worker']) delivery.includes(x)?ok(`Delivery worker ${x}`):fail(`Delivery worker missing ${x}`);
for(const [file, needles] of [
 ['supabase/functions/communication-provider-webhook/index.ts',['COMMUNICATION_WEBHOOK_SECRET','constantTimeEqual']],
 ['supabase/functions/sms-delivery-report/index.ts',['AT_DLR_SECRET','constantTimeEqual']],
 ['supabase/functions/whatsapp-webhook/index.ts',['WHATSAPP_VERIFY_TOKEN','WHATSAPP_APP_SECRET','hmacSha256Hex']]
]) for(const x of needles) read(file).includes(x)?ok(`Provider gate ${file}: ${x}`):fail(`Provider gate ${file} missing ${x}`);
console.log(`COMM-10-12 static sweep complete (${migrations.length} migrations)`);
