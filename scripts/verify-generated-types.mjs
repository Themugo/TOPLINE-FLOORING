import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'src', 'types', 'database.ts');
const failures = [];

if (!fs.existsSync(target)) {
  if (process.env.REQUIRE_GENERATED_TYPES === 'true') {
    console.error('Generated database types are required but src/types/database.ts is missing.');
    process.exit(1);
  }
  console.log('Generated database types: not present yet. Run npm run db:types after successful local database replay.');
  process.exit(0);
}

const text = fs.readFileSync(target, 'utf8');
if (!/export\s+type\s+Database\s*=\s*\{/s.test(text)) failures.push('database.ts does not contain the expected Supabase Database type contract.');
if (!/Tables:\s*\{/s.test(text)) failures.push('database.ts is missing the generated Tables contract.');
if (!/Functions:\s*\{/s.test(text)) failures.push('database.ts is missing the generated Functions contract.');
if (!/Enums:\s*\{/s.test(text)) failures.push('database.ts is missing the generated Enums contract.');
if (/example\.com|nirchkrkwtpobwtrkpgy|password|admin123|ToplineSecure2024!/i.test(text)) failures.push('generated type file contains prohibited placeholder/credential text.');
if (text.length < 500) failures.push('database.ts is unexpectedly small and does not look like a generated Supabase schema artifact.');

if (failures.length) {
  console.error('Generated database types contract failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Generated database types contract passed (${text.length.toLocaleString()} bytes).`);
