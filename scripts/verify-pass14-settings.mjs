import fs from 'node:fs';
const m = fs.readFileSync('supabase/migrations/20261103120000_staff_read_site_settings_and_product_children.sql','utf8');
for (const n of ["ON public.site_settings", "current_user_has_permission('content', 'select')", 'product_variants', 'product_images', 'product_specifications', 'product_documents', "'catalog'"]) if (!m.includes(n)) throw new Error('Pass 14 migration missing: ' + n);
const ss = fs.readFileSync('src/pages/admin/site-settings.tsx','utf8');
if (!ss.includes('loadFailed')) throw new Error('Site settings must refuse to save after a failed load');
const db = fs.readFileSync('src/lib/db.ts','utf8');
if (!db.includes('export function errorMessage')) throw new Error('errorMessage helper missing');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
for (const f of [...walk('src/pages/admin'), ...walk('src/components/admin')].filter((x) => x.endsWith('.tsx'))) {
  const t = fs.readFileSync(f, 'utf8');
  if (/(\w+) instanceof Error \? \1\.message/.test(t)) throw new Error('Admin error drops Postgrest messages: ' + f);
  if (/const errorMessage = errorMessage/.test(t)) throw new Error('shadowed errorMessage: ' + f);
}
console.log('verify-pass14-settings: OK');
