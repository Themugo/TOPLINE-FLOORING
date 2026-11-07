import fs from 'node:fs';
const script = fs.readFileSync('scripts/validate-linked-supabase.mjs', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = fs.readFileSync('supabase/config.toml', 'utf8');
const failures = [];
const required = [
  ['explicit linked-read opt-in', /TOPLINE_ALLOW_LINKED_DB_READS !== 'true'/],
  ['pinned linked project check', /linkedRef !== expectedRef/],
  ['remote migration history read', /migration', 'list', '--linked/],
  ['linked deployment dry-run', /db', 'push', '--dry-run', '--linked/],
  ['linked lint fails on SQL errors', /db', 'lint', '--linked', '--fail-on', 'error/],
  ['machine-readable evidence', /linked-supabase-summary\.json/],
  ['migration manifest evidence', /local-migration-manifest\.sha256/],
];
for (const [label, re] of required) if (!re.test(script)) failures.push(`Missing ${label}`);
for (const forbidden of [/db', 'push', '--linked'/, /db', 'reset', '--linked'/, /migration', 'repair'/, /migration', 'up'/, /config', 'push'/]) {
  if (forbidden.test(script)) failures.push(`Forbidden linked mutation command present: ${forbidden}`);
}
if (!pkg.scripts['validate:linked-supabase']) failures.push('package.json is missing validate:linked-supabase');
if (!config.includes('project_id = "cvjmfplhdlfvqnnmzqcp"')) failures.push('Supabase project ref is not pinned to Topline');
if (failures.length) {
  console.error('G-03 linked Supabase safety verifier FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('G-03 linked Supabase safety verifier PASSED (read-only command contract, target pin, opt-in, evidence outputs).');
