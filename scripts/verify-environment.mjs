import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const envExample = readFileSync('.env.example', 'utf8');
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
  if (!envExample.includes(key)) throw new Error(`.env.example is missing ${key}`);
}
if (!envExample.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) throw new Error('Topline Supabase URL missing from environment contract.');

const secretFiles = ['.env', '.env.local', '.env.production'];
const gitTrackedFiles = existsSync('.git')
  ? execFileSync('git', ['ls-files', '--', ...secretFiles], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
  : [];
if (gitTrackedFiles.length > 0) {
  throw new Error(`Secret-bearing environment files are tracked by git: ${gitTrackedFiles.join(', ')}`);
}
if (!existsSync('.git')) {
  for (const secretFile of secretFiles) {
    if (existsSync(secretFile)) throw new Error(`${secretFile} must not be included in a release package.`);
  }
}

const gitignore = readFileSync('.gitignore', 'utf8');
if (!gitignore.includes('.env*')) throw new Error('.gitignore must exclude environment files.');
if (!gitignore.includes('node_modules')) throw new Error('.gitignore must exclude node_modules.');

const supabase = readFileSync('src/lib/supabase.ts', 'utf8');
if (!supabase.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) throw new Error('Supabase client is not pinned to Topline.');
if (supabase.includes('admin123') || supabase.includes('ToplineSecure2024')) throw new Error('Legacy credentials found in Supabase client.');

console.log('Environment contract verification passed.');
