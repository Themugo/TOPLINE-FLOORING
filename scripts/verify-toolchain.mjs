import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];
const warnings = [];

if (process.versions.node.split('.')[0] < 20) failures.push(`Node.js ${process.version} is unsupported; use Node 20 LTS or newer.`);
if (process.platform === 'win32' && root.includes('&')) warnings.push(`Windows project path contains '&': ${root}. Repository scripts avoid npm .bin resolution, but a path without '&' remains recommended.`);

const configPath = path.join(root, 'supabase', 'config.toml');
const config = fs.readFileSync(configPath, 'utf8');
if (!config.includes('project_id = "jypkhvknfgoqrhwzbdwi"')) failures.push('Supabase config is not pinned to the dedicated Topline project.');
if (/\[auth\.email\][\s\S]*?enabled\s*=/.test(config)) failures.push('Supabase config contains obsolete [auth.email].enabled.');

const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter((f) => f.endsWith('.sql'));
if (migrations.length !== 25) failures.push(`Expected 25 active migrations, found ${migrations.length}.`);

for (const required of ['.env.example','package-lock.json','supabase/config.toml']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`Missing required repository file: ${required}`);
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (failures.length) {
  console.error('Topline toolchain verification FAILED.');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Topline toolchain verification PASSED.');
console.log(`- Node: ${process.version}`);
console.log(`- Active migrations: ${migrations.length}`);
console.log('- Supabase target: jypkhvknfgoqrhwzbdwi');
