import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const guard = read('src/components/admin/AdminGuard.tsx');
const permissions = read('src/lib/admin-permissions.ts');
const nav = read('src/lib/admin-nav.ts');
const rbac = read('src/lib/staff-rbac.ts');
const checks = [
  ['protected admin paths are identified explicitly', /isProtectedAdminPath = normalizedPath === '\/admin' \|\| normalizedPath\.startsWith\('\/admin\/'\)/.test(guard)],
  ['unknown admin paths fail closed', /isProtectedAdminPath && !effectivePermission/.test(guard)],
  ['route permission lookup uses normalized path', /ROUTE_PERMISSIONS\[normalizedPath\]/.test(guard)],
  ['permission denial occurs before child render', guard.indexOf('hasPermission(result.permissions') > guard.indexOf('isProtectedAdminPath && !effectivePermission')],
  ['route map remains explicit', Object.keys(permissions.match(/'\/admin[^']*'\s*:/g) ?? {}).length >= 69],
  ['staff permissions remain server-derived', rbac.includes("rpc('get_current_staff_permissions')")],
  ['manage permission compatibility remains explicit', rbac.includes("permission.action === 'manage'")],
  ['navigation normalization remains in place', nav.includes('normalizeAdminPath')],
  ['active staff profile remains required', guard.includes('profile?.is_active')],
  ['session inactivity timeout remains enforced', guard.includes('SESSION_TIMEOUT_MS = 30 * 60 * 1000')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 9 Admin RBAC fail-closed verification: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
