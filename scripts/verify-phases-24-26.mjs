import fs from 'node:fs';
const checks = [
 ['notification migration','supabase/migrations/20260910170000_customer_journey_notifications.sql'],
 ['customer journey library','src/lib/customer-journey.ts'],
 ['communications library','src/lib/communications.ts'],
 ['communication center','src/pages/admin/communications.tsx'],
 ['portal timeline','src/pages/portal.tsx'],
 ['communications route','src/App.tsx'],
 ['initiative docs','docs/PHASES_24_26_CUSTOMER_JOURNEY_COMMUNICATIONS.md'],
];
for (const [label,file] of checks) if(!fs.existsSync(file)) throw new Error(`Missing ${label}: ${file}`);
const sql=fs.readFileSync(checks[0][1],'utf8');
for(const token of ['notification_events','communication_outbox','emit_customer_journey_event','get_customer_journey','queue_customer_message']) if(!sql.includes(token)) throw new Error(`Missing SQL contract: ${token}`);
console.log('Phase 24–26 source verification passed.');
