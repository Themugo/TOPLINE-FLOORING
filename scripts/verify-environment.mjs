import { existsSync, readFileSync } from 'node:fs';

const envExample = readFileSync('.env.example', 'utf8');
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
  if (!envExample.includes(key)) throw new Error(`.env.example is missing ${key}`);
}
if (!envExample.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) throw new Error('Topline Supabase URL missing from environment contract.');

for (const secretFile of ['.env', '.env.local', '.env.production']) {
  if (existsSync(secretFile)) throw new Error(`${secretFile} must not be committed or packaged.`);
}

const gitignore = readFileSync('.gitignore', 'utf8');
if (!gitignore.includes('.env*')) throw new Error('.gitignore must exclude environment files.');
if (!gitignore.includes('node_modules')) throw new Error('.gitignore must exclude node_modules.');

const supabase = readFileSync('src/lib/supabase.ts', 'utf8');
if (!supabase.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) throw new Error('Supabase client is not pinned to Topline.');
if (supabase.includes('admin123') || supabase.includes('ToplineSecure2024')) throw new Error('Legacy credentials found in Supabase client.');

console.log('Environment contract verification passed.');
