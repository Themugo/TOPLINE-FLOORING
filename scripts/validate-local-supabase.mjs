import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const artifactsDir = path.join(root, 'artifacts', 'database-replay');
const logPath = path.join(artifactsDir, 'database-replay.log');
const summaryPath = path.join(artifactsDir, 'database-replay-summary.json');
const expectedCount = Number(process.env.TOPLINE_EXPECTED_MIGRATION_COUNT ?? '163');
const startedAt = new Date().toISOString();
const results = [];
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(logPath, `Topline disposable Supabase migration replay\nStarted: ${startedAt}\n`);

function record(line) {
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(line);
}
function finish(status, extra = {}) {
  const summary = {
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    expectedMigrationCount: expectedCount,
    actualMigrationCount: migrations.length,
    migrationManifestSha256,
    firstMigration: migrations[0] ?? null,
    lastMigration: migrations.at(-1) ?? null,
    databaseOperations: results,
    ...extra,
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  record(`Replay status: ${status}`);
}

// Destructive reset is permitted only for a disposable local Supabase stack.
if (process.env.TOPLINE_ALLOW_LOCAL_DB_RESET !== 'true') {
  record('BLOCKED: set TOPLINE_ALLOW_LOCAL_DB_RESET=true only when the target is a disposable local database.');
  process.exit(2);
}
if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new Error('TOPLINE_EXPECTED_MIGRATION_COUNT must be a positive integer.');

const migrationsDir = path.join(root, 'supabase', 'migrations');
const typesTarget = path.join(root, 'src', 'types', 'database.ts');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (migrations.length !== expectedCount) throw new Error(`Expected ${expectedCount} active migrations; found ${migrations.length}. Review the expected count before replay.`);
if (migrations.some((f) => !/^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/.test(f))) throw new Error('An active migration filename violates the 14-digit timestamp contract.');
if (new Set(migrations.map((f) => f.slice(0, 14))).size !== migrations.length) throw new Error('Duplicate migration timestamps detected.');
const manifest = migrations.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(migrationsDir, f))).digest('hex')}  ${f}`).join('\n') + '\n';
const migrationManifestSha256 = crypto.createHash('sha256').update(manifest).digest('hex');
fs.writeFileSync(path.join(artifactsDir, 'migration-manifest.sha256'), manifest);
record(`Active migration count: ${migrations.length}`);
record(`First migration: ${migrations[0]}`);
record(`Last migration: ${migrations.at(-1)}`);
record(`Migration manifest SHA-256: ${migrationManifestSha256}`);

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
function run(args, label) {
  record(`\n>>> ${label}: npx supabase ${args.join(' ')}`);
  try {
    const out = execFileSync(npxCommand, ['supabase', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    if (out.trim()) record(out.trim());
    results.push({ label, status: 'passed' });
    record(`${label}: PASSED`);
    return out;
  } catch (err) {
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    if (detail) record(detail);
    results.push({ label, status: 'failed', exitCode: err.status ?? null, error: detail.slice(-12000) });
    finish('failed', { failedStep: label });
    throw new Error(`${label}: failed; see ${path.relative(root, logPath)}\n${detail}`);
  }
}

try {
  // Fail early with a useful message instead of allowing the Supabase CLI to fail obscurely.
  try {
    const dockerVersion = execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    record(`Docker daemon: available (${dockerVersion})`);
  } catch {
    throw new Error('Docker daemon is unavailable. Start Docker Desktop (or the Docker service) before running the disposable Supabase replay.');
  }

  run(['--version'], 'Supabase CLI version');
  run(['start'], 'Supabase local start');
  run(['db', 'reset', '--local'], 'Fresh local database reset and ordered migration replay');
  run(['db', 'lint', '--local'], 'Local database lint');
  run(['test', 'db', '--local'], 'Local SQL regression tests');
  const types = run(['gen', 'types', 'typescript', '--local'], 'Local TypeScript database type generation');
  fs.mkdirSync(path.dirname(typesTarget), { recursive: true });
  fs.writeFileSync(typesTarget, types);
  record(`Generated database types: ${path.relative(root, typesTarget)}`);
  finish('passed');
} catch (error) {
  if (!fs.existsSync(summaryPath)) finish('failed', { error: error.message });
  console.error(error.message);
  process.exit(1);
}
