import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const migrationsDir=path.join(root,'supabase','migrations');
const files=fs.readdirSync(migrationsDir).filter(f=>f.endsWith('.sql')).sort();
const latest=files.at(-1)??'';
if(!latest.startsWith('20260913183000_097_private_document_storage_boundary_360.sql')) throw new Error(`Expected 096 latest, found ${latest}`);
const m095=fs.readFileSync(path.join(migrationsDir,'20260913180000_095_rpc_authorization_certification_360.sql'),'utf8');
const m096=fs.readFileSync(path.join(migrationsDir,'20260913181000_096_rls_policy_executor_boundary_repair_360.sql'),'utf8');
const m097=fs.readFileSync(path.join(migrationsDir,latest),'utf8');
for(const t of [
 'private.current_user_has_role','private.assert_customer_owns_project','private.assert_customer_owns_order','private.assert_project_order_consistency','rpc_authorization_certifications',
 'Owner approval required for privileged access decisions','Requester cannot approve their own privileged access request','Owner approval required for elevated role grants','Customer access denied','Project does not belong to customer','Order does not belong to customer',
 'REVOKE EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text)',
 'REVOKE EXECUTE ON FUNCTION public.claim_communication_outbox(integer)',
 'REVOKE EXECUTE ON FUNCTION public.complete_communication_delivery(uuid,text,text)',
 'REVOKE EXECUTE ON FUNCTION public.fail_communication_delivery(uuid,text,boolean)',
 'REVOKE EXECUTE ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric)']) if(!m095.includes(t)) throw new Error(`095 missing ${t}`);
if(!m096.includes('GRANT EXECUTE ON FUNCTION private.current_user_has_permission(text,text) TO authenticated')) throw new Error('096 missing RLS helper grant');
if(!m097.includes('private-documents')) throw new Error('Private document storage migration missing');
const sql=path.join(root,'scripts','security','adversarial-rls-smoke.sql');
if(!fs.existsSync(sql)) throw new Error('Missing adversarial RLS smoke test');
console.log('Application Security & Trust Boundary static verification PASSED');
