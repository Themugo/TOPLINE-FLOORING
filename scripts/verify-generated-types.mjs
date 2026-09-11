import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'src', 'types', 'database.ts');
const env = process.env.VITE_SUPABASE_URL || '';

if (!fs.existsSync(target)) {
  console.log('Generated database types: not present yet. Run npm run db:types after a successful local/linked Supabase connection.');
  process.exit(0);
}

const text = fs.readFileSync(target, 'utf8');
const failures = [];
if (!/export\s+type\s+Database\s*=/.test(text)) failures.push('database.ts does not export Database type.');
if (/example\.com|nirchkrkwtpobwtrkpgy|password|admin123|ToplineSecure2024!/i.test(text)) failures.push('generated type file contains prohibited placeholder/credential text.');
if (env && !env.includes('jypkhvknfgoqrhwzbdwi')) console.warn('Warning: VITE_SUPABASE_URL is not the configured Topline project.');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Generated database types contract passed.');
