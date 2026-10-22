// Runs every numbered test file in order and prints an honest summary. Exit code 1 if anything failed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { HERE, WORK } from './config.mjs';
fs.mkdirSync(WORK, { recursive: true }); try { fs.rmSync(`${WORK}/results.json`); } catch { /* first run */ }
const files = fs.readdirSync(HERE).filter((f) => /^\d\d-.*\.mjs$/.test(f)).sort();
let pass = 0, fail = 0;
for (const f of files) {
  console.log(`\n=== ${f}`);
  const r = spawnSync('node', [path.join(HERE, f)], { encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  for (const line of out.split('\n')) { if (/^(PASS|FAIL)\s/.test(line) || /^\s+->/.test(line)) console.log(line.slice(0, 300)); }
  pass += (out.match(/^PASS\s/gm) || []).length; fail += (out.match(/^FAIL\s/gm) || []).length;
  if (r.status !== 0 && !/^FAIL\s/m.test(out)) { fail++; console.log(`CRASH ${f}\n${out.slice(-600)}`); }
}
console.log(`\nE2E SUMMARY: ${pass} passed, ${fail} failed (${pass + fail} total). Results: ${WORK}/results.json`);
process.exit(fail ? 1 : 0);
