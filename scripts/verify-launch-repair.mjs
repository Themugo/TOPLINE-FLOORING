import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const ok = (name, condition, detail = '') => checks.push({ name, pass: Boolean(condition), detail });

const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'));
const repairMigration = migrationFiles.find((f) => f.includes('service_catalog_and_communications_worker_hardening'));
const serviceMigration = repairMigration ? read(`supabase/migrations/${repairMigration}`) : '';
const serviceAdmin = read('src/pages/admin/services.tsx');
const serviceHook = read('src/hooks/use-data.ts');
const serviceTypes = read('src/lib/types.ts');
const scheduler = read('supabase/functions/operations-scheduler/index.ts');
const delivery = read('supabase/functions/deliver-communications/index.ts');
const brevo = read('supabase/functions/brevo-test-email/index.ts');

ok('Service repair migration exists', Boolean(repairMigration));
ok('Service slug column reconciled', serviceMigration.includes('ADD COLUMN IF NOT EXISTS slug text'));
ok('Service short description reconciled', serviceMigration.includes('ADD COLUMN IF NOT EXISTS short_description text'));
ok('Service icon reconciled', serviceMigration.includes('ADD COLUMN IF NOT EXISTS icon text'));
ok('Service features reconciled as JSON', serviceMigration.includes("ADD COLUMN IF NOT EXISTS features jsonb"));
ok('Existing service slugs are backfilled', serviceMigration.includes('WHERE slug IS NULL OR btrim(slug) ='));
ok('Service slugs are unique', serviceMigration.includes('services_slug_unique_idx'));
ok('Project-service direct relation added safely', serviceMigration.includes('ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services'));
ok('Admin service form writes canonical fields', serviceAdmin.includes('short_description') && serviceAdmin.includes('features') && serviceAdmin.includes('slug'));
ok('Service hook reads/writes services', serviceHook.includes("from('services')") && serviceHook.includes('createService') && serviceHook.includes('updateService'));
ok('Frontend Service type matches repaired schema', serviceTypes.includes('slug: string;') && serviceTypes.includes('short_description: string | null;') && serviceTypes.includes('features: string[];'));
ok('Scheduler includes delivery worker', scheduler.includes("'deliver_communications'"));
ok('Scheduler calls delivery Edge Function', scheduler.includes('/functions/v1/deliver-communications'));
ok('Scheduler authenticates delivery call', scheduler.includes("'x-topline-worker-secret': workerSecret"));
ok('Delivery worker uses Brevo API', delivery.includes('https://api.brevo.com/v3/smtp/email'));
ok('Delivery worker uses idempotency', delivery.includes('Idempotency-Key'));
ok('Brevo test remains server-secret based', brevo.includes('Deno.env.get("BREVO_API_KEY")') && !brevo.includes('import.meta.env.BREVO_API_KEY'));

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
console.log(`Launch repair verifier: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
