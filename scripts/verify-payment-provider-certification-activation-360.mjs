import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const fail=m=>{console.error(`FAIL: ${m}`);process.exit(1)};
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d+_.*\.sql$/.test(f)).sort();
const certificationMigration=migrations.find(f=>f.startsWith('20261002210000_payment_provider_certification_activation_360.sql'));
if(!certificationMigration) fail('Certification/activation migration is missing.');
const sql=fs.readFileSync(path.join(root,'supabase/migrations',certificationMigration),'utf8');
for(const token of ['payment_provider_certifications','record_payment_provider_certification_360','get_payment_provider_release_gate_360','save_payment_gateway_control_360','REVOKE INSERT, UPDATE, DELETE ON public.payment_gateway_methods FROM authenticated','expire_stale_payment_attempts_360']) if(!sql.includes(token)) fail(`Missing certification control: ${token}`);
const admin=fs.readFileSync(path.join(root,'src/pages/admin/site-control.tsx'),'utf8');
if(!admin.includes('save_payment_gateway_control_360')) console.warn('WARN: Admin UI still writes payment gateway rows directly; route it through the certification control RPC before production activation.');
const secrets=['MPESA_CONSUMER_SECRET','MPESA_PASSKEY','CARD_GATEWAY_SECRET','PAYMENT_CARD_WEBHOOK_SECRET'];
for(const secret of secrets){if(sql.includes(secret)) fail(`Provider secret name must not be embedded in certification SQL: ${secret}`)}
const report=fs.readFileSync(path.join(root,'PAYMENT-PROVIDER-CERTIFICATION-ACTIVATION-360.md'),'utf8');
if(!report.includes('no named card provider')) fail('Card provider selection boundary missing.');
console.log(`Payment Provider Certification + Activation 360: STRUCTURAL PASS (${migrations.length} migrations)`);
