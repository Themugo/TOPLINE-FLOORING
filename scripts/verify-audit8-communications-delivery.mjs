import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261106190000_audit8_communications_delivery_hardening.sql'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'supabase/functions/deliver-communications/index.ts'), 'utf8');
const emailWebhook = fs.readFileSync(path.join(root, 'supabase/functions/communication-provider-webhook/index.ts'), 'utf8');
const smsWebhook = fs.readFileSync(path.join(root, 'supabase/functions/sms-delivery-report/index.ts'), 'utf8');
const whatsappWebhook = fs.readFileSync(path.join(root, 'supabase/functions/whatsapp-webhook/index.ts'), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

must(migration.includes('channel = p_channel') && migration.includes('provider IS NULL OR lower(provider)'), 'Provider callbacks must be scoped by channel and provider');
must(migration.includes('normalize_customer_phone(recipient)=public.normalize_customer_phone(p_phone)'), 'SMS reports must validate the callback destination');
must(migration.includes('apply_communication_delivery_state_worker'), 'SMS reports and provider callbacks must use monotonic delivery-state application');
must(worker.includes('claim_communication_outbox_worker') && worker.includes('p_channels: channels'), 'Worker must claim only configured channels');
must(worker.includes('record_communication_delivery_attempt_worker') && worker.includes('mark_communication_delivery_uncertain_worker'), 'Worker must retain attempt and uncertain-outcome protection');
must(emailWebhook.includes('COMMUNICATION_WEBHOOK_SECRET') && emailWebhook.includes('constantTimeEqual'), 'Email/provider webhook must be secret-authenticated');
must(smsWebhook.includes('AT_DLR_SECRET') && smsWebhook.includes('constantTimeEqual'), 'SMS callback must be secret-authenticated');
must(whatsappWebhook.includes('WHATSAPP_APP_SECRET') && whatsappWebhook.includes('hmacSha256Hex'), 'WhatsApp webhook must be HMAC-authenticated');
console.log('Phase 8 communications delivery static verification PASSED');
