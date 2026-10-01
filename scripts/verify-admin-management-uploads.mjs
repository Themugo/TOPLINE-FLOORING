import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const mig = '20260930190000_staff_read_inactive_cms_catalog_rows.sql';
check(fs.existsSync(path.join(root, 'supabase/migrations', mig)), 'Missing staff-read-inactive migration');
check(read('supabase/MIGRATION_MANIFEST.md').includes(mig), 'Manifest missing staff-read-inactive migration');
const sql = fs.existsSync(path.join(root, 'supabase/migrations', mig)) ? read(`supabase/migrations/${mig}`) : '';
check(sql.includes("'services','content'") && sql.includes("current_user_has_permission(%L, ''select'')"), 'Staff SELECT policy for services missing');
check(!/FOR\s+(INSERT|UPDATE|DELETE)/i.test(sql), 'Migration must not alter write policies');

for (const f of ['src/components/ui/image-upload.tsx', 'src/pages/admin/media-library.tsx', 'src/lib/upload.ts']) {
  check(!read(f).includes('readAsDataURL'), `${f} must not embed images as base64 data URLs`);
}
check(read('src/lib/upload.ts').includes('uploadImageToStorage'), 'Shared uploader missing');
check(!/image\/svg\+xml/.test(read('src/lib/upload.ts').split('\n').filter((l) => l.includes('ALLOWED_TYPES =')).join('')), 'SVG must not be allowed (bucket rejects it)');
const page = read('src/pages/admin/services.tsx');
check(!page.includes('getServicePlaceholder(form.name)'), 'Admin must not persist placeholder image URLs');
check(page.includes('uniqueSlug') && page.includes('describeError'), 'Services admin missing unique slug / error reporting');
const hook = read('src/hooks/use-data.ts');
check(!/useServices[\s\S]{0,900}catch \{\s*setServices\(\[\]\);/.test(hook), 'useServices must report load errors');

if (failures.length) { console.error('Admin management/upload verification FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('Admin management and upload static verification PASSED.');
