import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push({ name, ok: Boolean(ok) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const guard = read('src/components/admin/AdminGuard.tsx');
const rbac = read('src/lib/staff-rbac.ts');
const login = read('src/pages/admin/login.tsx');
const migration = read('supabase/migrations/20260914110000_108_admin_authentication_authorization_360.sql');
const app = read('src/App.tsx');

check('Admin guard verifies Auth identity with getUser', guard.includes('supabase.auth.getUser()'));
check('Admin guard requires active staff profile', guard.includes('profile?.is_active'));
check('Admin guard loads effective permissions', guard.includes('getCurrentStaffPermissions'));
check('Admin guard has explicit unauthorized UI', guard.includes('Access restricted'));
check('Admin guard owns inactivity timeout', guard.includes('SESSION_TIMEOUT_MS = 30 * 60 * 1000'));
check('Auth callback defers async verification', guard.includes('window.setTimeout(() =>'));
check('login page no longer owns session timeout', !login.includes('SESSION_TIMEOUT_MS'));
check('RBAC exposes permission type', rbac.includes('export interface StaffPermission'));
check('RBAC loads server-derived permissions', rbac.includes("rpc('get_current_staff_permissions')"));
check('all Admin routes remain behind AdminAuthGuard', (app.match(/<AdminAuthGuard>/g) ?? []).length >= 2);
check('DB permission RPC uses SECURITY DEFINER', migration.includes('get_current_staff_permissions()') && migration.includes('SECURITY DEFINER'));
check('DB permission RPC has fixed empty search_path', migration.includes('get_current_staff_permissions()') && migration.includes("SET search_path = ''"));
check('DB permission RPC is not callable by anon', migration.includes('REVOKE ALL ON FUNCTION public.get_current_staff_permissions() FROM anon'));
check('DB permission RPC is executable by authenticated', migration.includes('GRANT EXECUTE ON FUNCTION public.get_current_staff_permissions() TO authenticated'));
check('authorization helpers use fixed empty search_path', migration.includes('private.current_user_is_staff()') && migration.includes('private.current_user_has_permission') && migration.includes('private.require_staff_permission') && (migration.match(/SET search_path = ''/g) ?? []).length >= 4);
check('profile RPC uses fixed empty search_path', migration.includes('public.get_current_staff_profile()') && migration.includes("SET search_path = ''"));

const passed = checks.filter((item) => item.ok).length;
const failed = checks.length - passed;
console.log(`\nAdmin Authentication & Authorization 360: ${passed}/${checks.length} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
