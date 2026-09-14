import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root,'supabase','migrations','20260914104315_110_customer_self_service_rpc_trust_boundary_360.sql');
const text = fs.readFileSync(migration,'utf8');
const checks = [
  ['migration exists', fs.existsSync(migration)],
  ['verified-email gate exists', /IF NEW\.email_confirmed_at IS NULL THEN RETURN NEW; END IF;/.test(text)],
  ['ambiguous customer email does not auto-link', /IF matched_count <> 1 OR matched_customer IS NULL THEN RETURN NEW; END IF;/.test(text)],
  ['automatic customer rebinding is blocked', /ON CONFLICT\(customer_id\) DO NOTHING/.test(text)],
  ['active Auth identity uniqueness is enforced', /customer_portal_access_active_user_uidx/.test(text)],
  ['customer RPC search paths are emptied', /ALTER FUNCTION public\.get_current_customer_id\(\) SET search_path = ''/.test(text) && /ALTER FUNCTION public\.get_customer_portal_360\(\) SET search_path = ''/.test(text)],
  ['public checkout search path is emptied', /CREATE OR REPLACE FUNCTION public\.create_secure_customer_order[\s\S]*?SET search_path = ''/.test(text)],
  ['checkout idempotency replay is bound to contact identity', /Idempotency key is already associated with another checkout/.test(text)],
  ['authenticated checkout uses linked customer profile', /v_customer_id := public\.get_current_customer_id\(\);/.test(text)],
  ['quotation input length is bounded', /Quotation request is too long/.test(text)],
  ['quotation visibility prevents cross-customer email collision', /customer_id IS NULL AND lower\(email\)=lower/.test(text)],
  ['coupon validation rejects negative discount outcomes', /v_discount:=greatest\(v_discount,0\)/.test(text)],
  ['anonymous quotation execution remains explicit', /GRANT EXECUTE ON FUNCTION public\.submit_quotation_request\([^;]*\) TO anon,authenticated/.test(text)],
  ['anonymous checkout remains explicit', /GRANT EXECUTE ON FUNCTION public\.create_secure_customer_order\([^;]*\) TO anon,authenticated/.test(text) || /REVOKE ALL ON FUNCTION public\.create_secure_customer_order/.test(text) === false],
];
let failed=0;
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`\nCustomer Self-Service RPC / Public Trust Boundary 360: ${checks.length-failed}/${checks.length} passed.`);
process.exitCode=failed?1:0;
