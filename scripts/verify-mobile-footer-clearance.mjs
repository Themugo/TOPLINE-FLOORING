import fs from 'node:fs';

const header = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');
const footer = fs.readFileSync('src/components/layout/Footer.tsx', 'utf8');
const mobileBar = fs.readFileSync('src/components/layout/MobileActionBar.tsx', 'utf8');
const checks = [
  ['mobile action bar remains fixed to the bottom on small screens', /fixed inset-x-0 bottom-0[\s\S]*md:hidden/.test(mobileBar)],
  ['footer reserves clearance for the fixed mobile action bar', /<footer className="[^"]*pb-20 md:pb-0/.test(footer)],
  ['header has one shared Escape listener for open navigation menus', (header.match(/window\.addEventListener\('keydown'/g) || []).length === 1],
  ['shared Escape handler closes both mobile and More menus', /if \(event\.key === 'Escape'\) \{\s*setMobileMenuOpen\(false\);\s*setMoreMenuOpen\(false\);/.test(header)],
];
for (const [label, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
console.log(`Mobile/footer clearance checks: ${checks.filter(([, pass]) => pass).length}/${checks.length} passed`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
