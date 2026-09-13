import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const expectedRef = 'zmbsskvnzjdaxuxlauyx';
const expectedUrl = `https://${expectedRef}.supabase.co`;
const envPath = resolve(process.cwd(), '.env');

let env = '';
try {
  env = readFileSync(envPath, 'utf8');
} catch {
  console.log('No .env file found. Target identity is still pinned in supabase/config.toml.');
  process.exit(0);
}

const values = Object.fromEntries(
  env
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1).trim()];
    })
);

if (values.VITE_SUPABASE_URL && values.VITE_SUPABASE_URL !== expectedUrl) {
  console.error(`Wrong Supabase target. Expected ${expectedUrl}, found ${values.VITE_SUPABASE_URL}.`);
  process.exit(1);
}

if (!values.VITE_SUPABASE_PUBLISHABLE_KEY && !values.VITE_SUPABASE_ANON_KEY) {
  console.error('Topline Supabase URL is correct, but no publishable/anon key is configured.');
  process.exit(1);
}

console.log(`Topline Supabase target verified: ${expectedRef}`);
