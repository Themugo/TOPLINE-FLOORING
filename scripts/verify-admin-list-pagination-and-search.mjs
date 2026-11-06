import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hook = read('src/hooks/use-pagination.ts');
const orders = read('src/pages/admin/orders.tsx');
const products = read('src/pages/admin/products.tsx');
const customers = read('src/pages/admin/customers.tsx');
const failures = [];
let passed = 0;
const check = (ok, message) => {
  if (ok) { passed += 1; console.log(`PASS ${message}`); }
  else failures.push(message);
};

check(/useEffect/.test(hook) && /lastValidPage\s*=\s*Math\.max\(0,\s*totalPages\s*-\s*1\)/.test(hook),
  'Shared pagination hook clamps page when filtered result count shrinks');
check(/if\s*\(page\s*>\s*lastValidPage\)\s*setPage\(lastValidPage\)/.test(hook),
  'Shared pagination clamp never permits a page beyond the last valid page');
check(/onChange=\{\(e\)\s*=>\s*\{\s*setSearch\(e\.target\.value\);\s*setPage\(0\);\s*\}\}/.test(orders),
  'Orders search resets to first page');
check(/setPage\(0\);\s*setAwaitingOnly/.test(orders),
  'Awaiting-payment filter resets to first page');
check(/const term\s*=\s*search\.trim\(\)\.replace\(\/\[%_,\(\)\*\\\\\]\/g,\s*' '\)/.test(orders),
  'Orders search neutralizes PostgREST filter metacharacters');
check(/onChange=\{\(e\)\s*=>\s*\{\s*setSearch\(e\.target\.value\);\s*setPage\(0\);\s*\}\}/.test(products),
  'Products search resets to first page');
check(/onChange=\{\(e\)\s*=>\s*\{\s*setSearch\(e\.target\.value\);\s*setPage\(0\);\s*\}\}/.test(customers),
  'Customers search resets to first page');
check(/const term\s*=\s*search\.trim\(\)\.replace\(\/\[%_,\(\)\*\\\\\]\/g,\s*' '\)/.test(customers),
  'Customer search neutralizes PostgREST filter metacharacters');
for (const [name, source] of [['orders', orders], ['products', products], ['customers', customers]]) {
  check(/const latestRequest = useRef\(0\)/.test(source) &&
    /const requestId = \+\+latestRequest\.current/.test(source) &&
    /if \(requestId !== latestRequest\.current\) return/.test(source),
    `${name} list ignores stale responses from older overlapping searches`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`Admin list pagination/filter regression checks: ${passed}/11 passed.`);
