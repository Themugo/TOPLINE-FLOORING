import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migration = fs.readFileSync(path.join(migrationsDir, '20260913180000_095_rpc_authorization_certification_360.sql'), 'utf8');

const required = [
  'private.current_user_has_role',
  'private.assert_customer_owns_project',
  'private.assert_customer_owns_order',
  'private.assert_project_order_consistency',
  'rpc_authorization_certifications',
  'Owner approval required for privileged access decisions',
  'Requester cannot approve their own privileged access request',
  'Owner approval required for elevated role grants',
  'Customer access denied',
  'Project does not belong to customer',
  'Order does not belong to customer',
  'REVOKE EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text)',
  'REVOKE EXECUTE ON FUNCTION public.claim_communication_outbox(integer)',
  'REVOKE EXECUTE ON FUNCTION public.complete_communication_delivery(uuid,text,text)',
  'REVOKE EXECUTE ON FUNCTION public.fail_communication_delivery(uuid,text,boolean)',
  'REVOKE EXECUTE ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric)',
  'create_project_issue',
  'create_project_task'
];
for (const token of required) if (!migration.includes(token)) throw new Error(`RPC certification migration missing: ${token}`);

const functionFiles = [];
const functionsDir = path.join(root, 'supabase', 'functions');
for (const dir of fs.readdirSync(functionsDir, {withFileTypes:true})) {
  if (!dir.isDirectory()) continue;
  const f=path.join(functionsDir,dir.name,'index.ts');
  if (fs.existsSync(f)) functionFiles.push(f);
}
for (const f of functionFiles) {
  const t=fs.readFileSync(f,'utf8');
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(t) && /console\.log|console\.error/.test(t) && /serviceRoleKey/.test(t)) {
    // Service role is allowed in server functions; this check only guards obvious logging of the key.
    if (/console\.(log|error)\([^\n]*(serviceRoleKey|SUPABASE_SERVICE_ROLE_KEY)/.test(t)) throw new Error(`Possible service-role secret logging in ${f}`);
  }
}

const storageMigration=fs.readFileSync(path.join(migrationsDir,'20260913183000_097_private_document_storage_boundary_360.sql'),'utf8');
if(!storageMigration.includes("private-documents") || !storageMigration.includes("public=false")) throw new Error('Private document storage boundary missing');

const sqlTest = path.join(root,'scripts','security','adversarial-rls-smoke.sql');
if (!fs.existsSync(sqlTest)) throw new Error('Missing adversarial RLS smoke test');

console.log('RPC Authorization Certification static verification PASSED');
