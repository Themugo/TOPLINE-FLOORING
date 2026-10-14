import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkReleaseEnvironmentFiles } from './lib-release-environment-check.mjs';

const originalReleaseMode = process.env.TOPLINE_RELEASE_ARTIFACT;
const originalCi = process.env.CI;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'topline-env-check-'));
const runGit = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: 'ignore', windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')} should succeed`);
};

try {
  runGit(tempRoot, ['init']);
  runGit(tempRoot, ['config', 'user.email', 'test@example.invalid']);
  runGit(tempRoot, ['config', 'user.name', 'TOPLINE verifier test']);
  fs.writeFileSync(path.join(tempRoot, '.gitignore'), '.env*\n');
  fs.writeFileSync(path.join(tempRoot, '.env.local'), 'TEST_ONLY=not-a-secret\n');

  delete process.env.TOPLINE_RELEASE_ARTIFACT;
  delete process.env.CI;
  let result = checkReleaseEnvironmentFiles(tempRoot);
  assert.equal(result.failures.length, 0, 'ignored and untracked local env files should be allowed in a developer checkout');
  assert.ok(result.notes.some((note) => note.includes('.env.local')), 'local env file should produce a clear note');

  runGit(tempRoot, ['add', '-f', '.env.local']);
  result = checkReleaseEnvironmentFiles(tempRoot);
  assert.ok(result.failures.some((failure) => failure.includes('tracked by Git')), 'tracked env files must fail');

  runGit(tempRoot, ['reset', '--', '.env.local']);
  process.env.TOPLINE_RELEASE_ARTIFACT = '1';
  result = checkReleaseEnvironmentFiles(tempRoot);
  assert.ok(result.failures.some((failure) => failure.includes('release mode')), 'release mode must reject local env files');

  console.log('Release environment check regression tests passed (3/3).');
} finally {
  if (originalReleaseMode === undefined) delete process.env.TOPLINE_RELEASE_ARTIFACT;
  else process.env.TOPLINE_RELEASE_ARTIFACT = originalReleaseMode;
  if (originalCi === undefined) delete process.env.CI;
  else process.env.CI = originalCi;
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
