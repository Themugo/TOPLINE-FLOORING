import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase', 'migrations', '20260914110200_admin_control_plane_privileged_operations_360.sql');
const text = fs.readFileSync(migration, 'utf8');
const checks = [
  ['control-plane migration exists', fs.existsSync(migration)],
  ['audit trigger pins empty search_path', /CREATE OR REPLACE FUNCTION private\.audit_log_change[\s\S]*?SET search_path = ''/.test(text)],
  ['role helper pins empty search_path', /CREATE OR REPLACE FUNCTION private\.current_user_has_role[\s\S]*?SET search_path = ''/.test(text)],
  ['bootstrap owner pins empty search_path', /CREATE OR REPLACE FUNCTION private\.bootstrap_owner[\s\S]*?SET search_path = ''/.test(text)],
  ['operational export requires system.read', /PERFORM private\.require_staff_permission\('system', 'read'\)/.test(text)],
  ['operational export no longer accepts customers.read fallback', !/current_user_has_permission\('customers', 'read'\)/.test(text)],
  ['anonymous export execution revoked', /REVOKE ALL ON FUNCTION public\.create_operational_data_export\(\) FROM anon/.test(text)],
  ['authenticated export execution explicitly retained', /GRANT EXECUTE ON FUNCTION public\.create_operational_data_export\(\) TO authenticated/.test(text)],
];
let failed = 0;
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`), failed += ok ? 0 : 1;
console.log(`\nAdmin Control-Plane & Privileged Operations 360: ${checks.length - failed}/${checks.length} passed.`);
process.exitCode = failed ? 1 : 0;
