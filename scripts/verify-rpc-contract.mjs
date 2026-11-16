// Frontend <-> database contract check for RPC calls.
// A wrong parameter name is NOT caught by TypeScript here and only fails at runtime in PostgREST ("could not find the
// function ... with parameters ..."). This replays the migrations to get each function's latest parameter list and
// checks every literal-object RPC call in src/ (direct supabase.rpc, the callLifecycle wrapper and the private rpc()
// wrappers in the quality-assurance and identity-access libraries).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

function splitTop(text) {
  const parts = []; let cur = ''; let depth = 0;
  for (const ch of text) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}
function balanced(text, start, open, close) {
  let depth = 1; let i = start;
  while (i < text.length && depth) { if (text[i] === open) depth++; else if (text[i] === close) depth--; i++; }
  return [text.slice(start, i - 1), i];
}

// 1. Latest signature of every public function (later migrations override earlier ones).
const signatures = new Map();
const migrationDir = path.join(root, 'supabase', 'migrations');
for (const file of fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8').replace(/--[^\n]*/g, '');
  for (const m of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_0-9]+)\s*\(/gi)) {
    const [args] = balanced(sql, m.index + m[0].length, '(', ')');
    const params = splitTop(args).map((p) => p.trim()).filter(Boolean).map((p) => {
      const match = p.match(/^(?:IN\s+|INOUT\s+)?([a-z_0-9]+)\s+/i);
      return match ? { name: match[1], optional: /\bDEFAULT\b|:=/i.test(p) } : null;
    }).filter(Boolean);
    signatures.set(m[1], params);
  }
}

// 2. Every literal-object call.
const problems = [];
let checked = 0;
const callPatterns = [
  { re: /\.rpc\(\s*(['"])([a-z_0-9]+)\1\s*,\s*\{/g },
  { re: /\bcallLifecycle\(\s*(['"])([a-z_0-9]+)\1\s*,\s*\{/g },
];
const privateWrapperFiles = ['quality-assurance-360.ts', 'identity-access-360.ts'];
const srcFiles = walk(path.join(root, 'src')).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('database.ts'));
for (const file of srcFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const patterns = [...callPatterns];
  if (privateWrapperFiles.includes(path.basename(file))) patterns.push({ re: /(?<![.\w])rpc\(\s*(['"])([a-z_0-9]+)\1\s*,\s*\{/g });
  for (const { re } of patterns) {
    for (const m of text.matchAll(re)) {
      const name = m[2];
      const [body] = balanced(text, m.index + m[0].length, '{', '}');
      let top = ''; let depth = 0;
      for (const ch of body) { if ('{[('.includes(ch)) depth++; if ('}])'.includes(ch)) depth--; top += depth === 0 ? ch : ' '; }
      if (top.includes('...')) continue; // spread: keys are not statically knowable
      const keys = new Set([...top.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z_0-9]*)\s*(?::|,|$)/g)].map((k) => k[1]));
      checked++;
      const rel = path.relative(root, file).replaceAll('\\', '/');
      const sig = signatures.get(name);
      if (!sig) { problems.push(`${rel}: RPC "${name}" is not defined in any migration`); continue; }
      const known = new Set(sig.map((p) => p.name));
      const unknown = [...keys].filter((k) => !known.has(k));
      const missing = sig.filter((p) => !p.optional && !keys.has(p.name)).map((p) => p.name);
      if (unknown.length) problems.push(`${rel}: ${name} is called with unknown parameter(s) ${unknown.join(', ')} (database expects ${[...known].join(', ') || 'none'})`);
      if (missing.length) problems.push(`${rel}: ${name} is missing required parameter(s) ${missing.join(', ')}`);
    }
  }
}

if (checked < 100) problems.push(`Only ${checked} RPC calls were inspected; the checker may be broken.`);
if (problems.length) {
  console.error('RPC contract verification FAILED.');
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`RPC contract verified: ${checked} calls match ${signatures.size} database function signatures.`);
