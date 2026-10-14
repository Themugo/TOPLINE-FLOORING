import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Distinguish an ignored, untracked developer .env file from a secret included
 * in source control or an explicitly prepared release artifact. A local
 * .env.local is a normal Vite development convention and must not make every
 * local verification command fail merely because it exists.
 */
export function checkReleaseEnvironmentFiles(root = process.cwd()) {
  const failures = [];
  const notes = [];
  const names = ['.env', '.env.local', '.env.production'];
  const releaseMode = process.env.TOPLINE_RELEASE_ARTIFACT === '1' || process.env.CI === 'true';
  const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
  const hasGit = gitRoot.status === 0 && Boolean(gitRoot.stdout?.trim());

  for (const name of names) {
    const absolute = path.join(root, name);
    if (!fs.existsSync(absolute)) continue;

    if (releaseMode) {
      failures.push(`${name} exists in CI/release mode and must be excluded from release artifacts.`);
      continue;
    }

    if (!hasGit) {
      failures.push(`${name} exists outside a Git checkout; remove it from the release/source package and load local secrets outside that package.`);
      continue;
    }

    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', name], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    if (tracked.status === 0) {
      failures.push(`${name} is tracked by Git and must be removed from version control.`);
      continue;
    }

    const ignored = spawnSync('git', ['check-ignore', '--quiet', '--', name], {
      cwd: root,
      stdio: 'ignore',
      windowsHide: true,
    });
    if (ignored.status === 0) {
      notes.push(`${name} exists locally, is ignored by Git, and is not tracked; keep it out of release archives.`);
    } else {
      failures.push(`${name} exists locally but is not ignored by Git; add a safe ignore rule and verify it is untracked.`);
    }
  }

  return { failures, notes };
}
