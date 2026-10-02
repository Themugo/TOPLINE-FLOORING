import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const target = path.join(root, 'src', 'types', 'database.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });
const output = execFileSync(npxCommand, ['supabase', 'gen', 'types', 'typescript', '--local'], { cwd: root, encoding: 'utf8' });
fs.writeFileSync(target, output);
console.log(`Generated database types: ${target}`);
