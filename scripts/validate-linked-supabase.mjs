import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const expectedRef = 'cvjmfplhdlfvqnnmzqcp';
const expectedCount = Number(process.env.TOPLINE_EXPECTED_MIGRATION_COUNT || 163);
const artifactDir = path.join(root, 'artifacts', 'linked-supabase-certification');
const linkedRefPath = path.join(root, 'supabase', '.temp', 'project-ref');
const configPath = path.join(root, 'supabase', 'config.toml');
const migrationDir = path.join(root, 'supabase', 'migrations');
const steps = [];
const startedAt = new Date().toISOString();

function record(name, status, details = '') {
  steps.push({ name, status, details });
  console.log(`[${status}] ${name}${details ? `: ${details}` : ''}`);
}
function writeEvidence() {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, 'linked-supabase-summary.json'), JSON.stringify({
    task: 'G-03 linked Supabase read-only certification',
    startedAt,
    completedAt: new Date().toISOString(),
    expectedProjectRef: expectedRef,
    expectedMigrationCount: expectedCount,
    linkedProjectRef: fs.existsSync(linkedRefPath) ? fs.readFileSync(linkedRefPath, 'utf8').trim() : null,
    steps,
    mutationPolicy: 'No db push without --dry-run, no reset, no migration repair, no migration up, no config push.',
  }, null, 2) + '\n');
}
function run(name, args) {
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(cmd, ['supabase', ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  fs.appendFileSync(path.join(artifactDir, 'linked-supabase.log'), `\n===== ${name} =====\n$ npx supabase ${args.join(' ')}\n${output}\nEXIT=${result.status ?? 'null'}\n`);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${name} exited ${result.status}. See artifacts/linked-supabase-certification/linked-supabase.log`);
  record(name, 'PASS', `exit 0${output ? `; ${output.split(/\r?\n/).slice(-2).join(' | ')}` : ''}`);
}

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, 'linked-supabase.log'), `G-03 read-only linked Supabase certification\nStarted: ${startedAt}\n`);

if (process.env.TOPLINE_ALLOW_LINKED_DB_READS !== 'true') {
  record('explicit linked-read opt-in', 'BLOCKED', 'Set TOPLINE_ALLOW_LINKED_DB_READS=true only after confirming the linked target is the intended Topline project.');
  writeEvidence();
  process.exit(2);
}

try {
  const config = fs.readFileSync(configPath, 'utf8');
  if (!config.includes(`project_id = "${expectedRef}"`)) throw new Error('supabase/config.toml is not pinned to the expected Topline project.');
  record('repository project identity', 'PASS', expectedRef);

  const migrations = fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
  const versions = migrations.map((name) => name.match(/^(\d{14})_/)?.[1]);
  if (migrations.length !== expectedCount) throw new Error(`Expected ${expectedCount} active migrations, found ${migrations.length}.`);
  if (versions.some((version) => !version) || new Set(versions).size !== versions.length) throw new Error('Migration filenames contain invalid or duplicate timestamps.');
  const manifest = migrations.map((name) => `${createHash('sha256').update(fs.readFileSync(path.join(migrationDir, name))).digest('hex')}  ${name}`).join('\n') + '\n';
  fs.writeFileSync(path.join(artifactDir, 'local-migration-manifest.sha256'), manifest);
  record('local migration inventory', 'PASS', `${migrations.length} unique migrations; ${migrations[0]} → ${migrations.at(-1)}`);

  if (!fs.existsSync(linkedRefPath)) throw new Error('No linked Supabase project found. Run `npx supabase link --project-ref cvjmfplhdlfvqnnmzqcp` after logging in.');
  const linkedRef = fs.readFileSync(linkedRefPath, 'utf8').trim();
  if (linkedRef !== expectedRef) throw new Error(`Linked project mismatch: expected ${expectedRef}, found ${linkedRef || '(empty)'}. No remote commands were run.`);
  record('linked project identity', 'PASS', linkedRef);

  run('Supabase CLI version', ['--version']);
  run('remote migration history (read-only)', ['migration', 'list', '--linked']);
  run('linked migration deployment dry-run (no apply)', ['db', 'push', '--dry-run', '--linked']);
  run('linked database lint (fail on errors)', ['db', 'lint', '--linked', '--fail-on', 'error']);
  record('G-03 command execution', 'PASS', 'All three linked read-only checks exited successfully. Review migration history and dry-run output for pending/divergent versions.');
} catch (error) {
  record('G-03 command execution', 'FAIL', error?.message || String(error));
  writeEvidence();
  process.exit(1);
}

writeEvidence();
console.log(`Evidence written to ${path.relative(root, artifactDir)}`);
