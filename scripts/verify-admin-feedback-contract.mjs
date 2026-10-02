import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// 1) Toasts must be one shared store, otherwise no message ever reaches the screen.
const toast = read('src/hooks/use-toast.tsx');
check(toast.includes('useSyncExternalStore') && /^let toasts/m.test(toast), 'useToast must use a shared module-level store');
check(!/useState<Toast\[\]>/.test(toast), 'useToast must not keep per-component toast state');

// 2) Admin pages must not discard Supabase write errors.
const dir = 'src/pages/admin';
for (const file of fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.tsx'))) {
  const src = read(`${dir}/${file}`);
  const bare = src.match(/^[ \t]*await supabase\.(from|rpc)\(/gm);
  if (bare) failures.push(`${dir}/${file}: ${bare.length} awaited Supabase call(s) discard the error result (use dbFailure from @/lib/db)`);
}
check(fs.existsSync(path.join(root, 'src/lib/db.ts')), 'src/lib/db.ts missing');

const tmpl = read('src/components/admin/ProjectTemplateLibrary.tsx');
check(!tmpl.includes('localStorage') && !tmpl.includes('DEFAULT_PROJECT_TEMPLATES'), 'ProjectTemplateLibrary must be database-backed (no localStorage / seeded templates)');
check(tmpl.includes(".from('project_templates')"), 'ProjectTemplateLibrary must read project_templates');
check(fs.existsSync(path.join(root, 'supabase/migrations/20260930200000_project_templates.sql')), 'project_templates migration missing');
const hero = read('src/pages/admin/hero-slides.tsx');
check(!hero.includes('slide-${Date.now()}'), 'Hero slides must not fabricate local records when the database write fails');

// Every routed admin page must declare a permission (otherwise any active staff member can open it).
const app = read('src/App.tsx');
const routeBlock = app.slice(app.indexOf('const adminRoutes'), app.indexOf('const AdminComponent'));
const routed = [...routeBlock.matchAll(/'(\/admin\/[a-z0-9-]+)':/g)].map((m) => m[1]);
const guard = read('src/components/admin/AdminGuard.tsx');
for (const route of routed) check(guard.includes(`'${route}':`), `Admin route ${route} has no entry in AdminGuard ROUTE_PERMISSIONS`);

if (failures.length) { console.error('Admin feedback contract FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('Admin feedback contract static verification PASSED.');
