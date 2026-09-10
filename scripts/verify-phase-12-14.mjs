import fs from 'node:fs';
import path from 'node:path';
const required = [
  'src/lib/customer-portal.ts','src/pages/portal.tsx','supabase/migrations/20260910130000_customer_portal_security.sql',
  'supabase/functions/customer-data-export/index.ts','src/pages/admin/backups.tsx','.github/workflows/ci.yml','docs/PHASES_12_14_PORTAL_BACKUP_CI.md'
];
const missing = required.filter(f => !fs.existsSync(path.resolve(f)));
if (missing.length) { console.error('Missing:', missing.join(', ')); process.exit(1); }
const app=fs.readFileSync('src/App.tsx','utf8'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); const wf=fs.readFileSync('.github/workflows/ci.yml','utf8');
if (!app.includes("'/portal'")) throw new Error('Portal route missing');
if (!pkg.scripts['verify:phases-12-14']) throw new Error('Verification script missing');
for (const cmd of ['npm ci','npm run lint','npm run typecheck','npm run build']) if (!wf.includes(cmd)) throw new Error(`CI missing ${cmd}`);
console.log('Phase 12–14 source verification passed.');
