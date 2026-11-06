import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/pages/admin/orders.tsx'), 'utf8');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// Pagination is zero-based throughout usePagination/Pagination. Search and filter
// changes must return to page 0 so stale offsets cannot request beyond filtered rows.
check(/onChange=\{\(e\) => \{\s*setSearch\(e\.target\.value\);\s*setPage\(0\);\s*\}\}/.test(source),
  'Order search must reset pagination to the first (zero-based) page');
check(/onClick=\{\(\) => \{\s*setPage\(0\);\s*setAwaitingOnly\(\(v\) => !v\);\s*\}\}/.test(source),
  'Awaiting-payment filter must reset pagination to the first (zero-based) page');
check(!/setPage\(1\);\s*setAwaitingOnly/.test(source),
  'Awaiting-payment filter must not select page 1 (second page)');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('Admin orders pagination regression checks: 3/3 passed.');
