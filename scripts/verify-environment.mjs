import { existsSync, readFileSync } from 'node:fs';
import { checkReleaseEnvironmentFiles } from './lib-release-environment-check.mjs';

const envExample = readFileSync('.env.example', 'utf8');
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
  if (!envExample.includes(key)) throw new Error(`.env.example is missing ${key}`);
}
if (!envExample.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) throw new Error('Topline Supabase URL missing from environment contract.');

const envCheck = checkReleaseEnvironmentFiles(process.cwd());
for (const note of envCheck.notes) console.warn(`NOTE ${note}`);
if (envCheck.failures.length) throw new Error(envCheck.failures.join('\n'));

const gitignore = readFileSync('.gitignore', 'utf8');
if (!gitignore.includes('.env*')) throw new Error('.gitignore must exclude environment files.');
if (!gitignore.includes('node_modules')) throw new Error('.gitignore must exclude node_modules.');

const supabase = readFileSync('src/lib/supabase.ts', 'utf8');
if (!supabase.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) throw new Error('Supabase client is not pinned to Topline.');
if (supabase.includes('admin123') || supabase.includes('ToplineSecure2024')) throw new Error('Legacy credentials found in Supabase client.');

console.log('Environment contract verification passed.');
