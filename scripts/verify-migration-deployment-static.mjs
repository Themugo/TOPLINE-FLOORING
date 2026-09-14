import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const files = fs.readdirSync(root).filter((f) => f.endsWith('.sql')).sort();
const text = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const failures = [];

const checks = [
  ['legacy private.has_staff_permission helper', /private\.has_staff_permission\s*\(/gi],
  ['aggregate cast before FILTER', /\bcount\s*\([^\n;]*\)::[A-Za-z0-9_]+\s+FILTER\s*\(/gi],
  ['trailing singleton IN comma', /\bIN\s*\(\s*'[^']+'\s*,\s*\)/gi],
  ['non-canonical RBAC read action', /private\.(?:current_user_has_permission|require_staff_permission)\s*\(\s*'[^']+'\s*,\s*'read'\s*\)/gi],
  ['staff_profiles referenced by nonexistent id key', /public\.staff_profiles\s*\(\s*id\s*\)/gi],
  ['nonexistent projects.expected_completion_date', /\bexpected_completion_date\b/gi],
  ['renewal role code read from request alias instead of staff_roles', /['"]role_code['"]\s*,\s*r\.code\b/gi],
];
for (const [label, re] of checks) {
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const isPendingWave = /_0(7[2-9]|8[0-8])_/.test(file);
    const applyCheck = !['non-canonical RBAC read action','staff_profiles referenced by nonexistent id key','nonexistent projects.expected_completion_date','renewal role code read from request alias instead of staff_roles'].includes(label) || isPendingWave;
    if (applyCheck && re.test(source)) failures.push(`${label}: ${file}`);
    re.lastIndex = 0;
  }
}

// Detect common PL/pgSQL mistakes: v_* variables and FOR loop variables used without declaration.
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const fnRe = /CREATE(?: OR REPLACE)? FUNCTION\s+[^\s(]+\s*\((.*?)\)\s*.*?AS \$\$(.*?)\$\$;/gis;
  let match;
  while ((match = fnRe.exec(source))) {
    const params = match[1];
    const body = match[2];
    const dm = body.match(/\bDECLARE\b(.*?)(?=\bBEGIN\b)/is);
    const declarations = dm?.[1] ?? '';
    const declared = new Set(declarations.match(/\bv_[A-Za-z_]\w*\b/gi) ?? []);
    const parameterVars = new Set(params.match(/\bv_[A-Za-z_]\w*\b/gi) ?? []);
    const usedVars = new Set(body.match(/\bv_[A-Za-z_]\w*\b/gi) ?? []);
    for (const v of usedVars) if (!declared.has(v) && !parameterVars.has(v)) failures.push(`undeclared variable ${v}: ${file}`);
    for (const [, loopVar] of body.matchAll(/\bFOR\s+([A-Za-z_]\w*)\s+IN\s+(?:SELECT|\()/gi)) {
      if (!new RegExp(`\\b${loopVar}\\b`, 'i').test(declarations) && !new RegExp(`\\b${loopVar}\\b`, 'i').test(params)) failures.push(`undeclared loop variable ${loopVar}: ${file}`);
    }
  }
}

if (files.length !== 82) failures.push(`expected 82 active migrations, found ${files.length}`);
if (!files.some((f) => f.startsWith('20260913170000_094_'))) failures.push('migration 094 missing');
if (!files.some((f) => f.startsWith('20260913180000_095_'))) failures.push('migration 095 missing');
if (!files.some((f) => f.startsWith('20260913181000_096_'))) failures.push('migration 096 missing');
if (!files.some((f) => f.startsWith('20260913183000_097_'))) failures.push('migration 097 missing');
if (!files.some((f) => f.startsWith('20260913190000_098_'))) failures.push('migration 098 missing');
if (!files.some((f) => f.startsWith('20260913195000_099_'))) failures.push('migration 099 missing');
if (!files.some((f) => f.startsWith('20260913200000_100_'))) failures.push('migration 100 missing');
if (!files.some((f) => f.startsWith('20260913210000_101_'))) failures.push('migration 101 missing');
if (!files.some((f) => f.startsWith('20260914080000_102_'))) failures.push('migration 102 missing');
if (!files.some((f) => f.startsWith('20260914110000_108_'))) failures.push('migration 108 missing');
if (!files.some((f) => f.startsWith('20260914110100_109_'))) failures.push('migration 109 missing');

if (failures.length) {
  console.error('Migration deployment static verification FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Migration deployment static verification PASSED (${files.length} migrations)`);
