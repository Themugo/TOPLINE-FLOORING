import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'frontend-certification');
fs.mkdirSync(outputDir, { recursive: true });
const read = (file) => fs.readFileSync(path.join(root, file));
const pkg = JSON.parse(read('package.json').toString('utf8'));
const lock = read('package-lock.json');
let commit = process.env.GITHUB_SHA || null;
if (!commit) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { commit = null; }
}
let npmVersion = process.env.npm_config_user_agent?.match(/npm\/(\S+)/)?.[1] || null;
if (!npmVersion) {
  try { npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(); }
  catch { npmVersion = null; }
}
const evidence = {
  generatedAt: new Date().toISOString(),
  commit,
  node: process.version,
  npm: npmVersion,
  package: { name: pkg.name, version: pkg.version, engines: pkg.engines },
  packageLock: {
    sha256: crypto.createHash('sha256').update(lock).digest('hex'),
    lockfileVersion: JSON.parse(lock.toString('utf8')).lockfileVersion,
  },
  commands: {
    install: 'npm ci',
    lint: 'npm run lint',
    typecheck: 'npm run typecheck',
    productionBuild: 'npm run build',
  },
  note: 'This file records the CI environment and intended commands; individual GitHub Actions step results are the execution evidence.',
};
fs.writeFileSync(path.join(outputDir, 'frontend-certification-environment.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Frontend certification environment recorded for ${commit || 'uncommitted local source'}.`);
