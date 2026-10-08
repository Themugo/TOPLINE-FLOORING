import fs from 'node:fs';
import path from 'node:path';

// Every database function the browser calls through supabase.rpc('name'). Shared by the generator and the verifier.
export function browserRpcNames(root = process.cwd()) {
  const names = new Set();
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  for (const f of walk('src').filter((x) => /\.(ts|tsx)$/.test(x) && !x.endsWith('src/types/database.ts'))) {
    for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/\.rpc\(\s*['"]([a-z_0-9]+)['"]/g)) names.add(m[1]);
  }
  return [...names].sort();
}
