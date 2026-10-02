import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/services.tsx'), 'utf8');
const hook = fs.readFileSync(path.join(root, 'src/hooks/use-data.ts'), 'utf8');
const failures = [];
const pass = (name, ok) => ok ? console.log(`PASS ${name}`) : failures.push(name);
pass('public services page has no hard-coded feature catalog', !page.includes('defaultFeatures'));
pass('public services page renders persisted service features only', page.includes('const featuresList = service.features || [];'));
pass('empty persisted feature lists do not fabricate feature claims', page.includes('{featuresList.length > 0 && ('));
pass('service update requires an affected database row', hook.includes(".update({ ...updates, updated_at: new Date().toISOString() })") && hook.includes(".select('id')") && hook.includes('Service was not updated.'));
pass('service delete requires an affected database row', hook.includes(".from('services').delete().eq('id', id).select('id')") && hook.includes('Service was not deleted.'));
if (page.match(/10[- ]Year|10[- ]year/)) failures.push('public services page contains an unscoped 10-year warranty claim');
if (failures.length) { console.error(`Service content authority verification FAILED: ${failures.length}`); failures.forEach(f=>console.error(`- ${f}`)); process.exit(1); }
console.log('Service content authority verification PASSED.');
