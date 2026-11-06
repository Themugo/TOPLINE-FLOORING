import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'supabase/migrations/20260912110000_060_sms_customer_notification_operations.sql',
  'supabase/functions/deliver-communications/index.ts',
  'supabase/functions/sms-delivery-report/index.ts',
  'supabase/functions/sms-delivery-report/deno.json',
  'src/pages/admin/communications.tsx',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const migration=fs.readFileSync(path.join(root,required[0]),'utf8');
const worker=fs.readFileSync(path.join(root,required[1]),'utf8');
const callback=fs.readFileSync(path.join(root,required[2]),'utf8');
for (const token of ['customer_notification_preferences','notification_rules','dedupe_key','record_sms_delivery_report','queue_customer_notification_for_event']) if (!migration.includes(token)) throw new Error(`Missing ${token}`);
for (const token of ['AT_USERNAME','AT_API_KEY','AT_SENDER_ID','messageId','africastalking']) if (!worker.includes(token)) throw new Error(`Missing SMS worker contract ${token}`);
for (const token of ['AT_DLR_SECRET','record_sms_delivery_report','Unauthorized']) if (!callback.includes(token)) throw new Error(`Missing callback security ${token}`);
if (/service_role|SUPABASE_SERVICE_ROLE_KEY/.test(fs.readFileSync(path.join(root,'src/pages/admin/communications.tsx'),'utf8'))) throw new Error('Service role leaked into frontend');
console.log('Phase 4 SMS and customer notification operations verification passed.');
