import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const portfolio = readFileSync(resolve('src/pages/portfolio.tsx'), 'utf8');
const loader = readFileSync(resolve('src/lib/public-projects.ts'), 'utf8');
const services = readFileSync(resolve('src/pages/services.tsx'), 'utf8');
const checks = [
  ['portfolio reads through the public view', /from\('public_projects'\)/.test(loader)],
  ['portfolio distinguishes request failure', /loadError/.test(portfolio) && /Retry loading/.test(portfolio)],
  ['portfolio has searchable project fields', /Search portfolio projects/.test(portfolio) && /searchable/.test(portfolio)],
  ['portfolio supports category filtering', /Filter projects by category/.test(portfolio) && /aria-pressed/.test(portfolio)],
  ['portfolio does not hard-code old project metrics', !/100% Quality Audited|Written 10-Yr Warranty|50,000\+ m² Installed/.test(portfolio)],
  ['portfolio avoids invented client/location/scope fallbacks', !/Metropolitan Area|Commercial Client|Confidential Commercial|Certified Handover|Commercial Spec/.test(portfolio)],
  ['portfolio has accessible case-study dialog', /role="dialog"/.test(portfolio) && /aria-modal="true"/.test(portfolio) && /aria-labelledby="portfolio-dialog-title"/.test(portfolio)],
  ['gallery supports keyboard dismissal/navigation', /event\.key === 'Escape'/.test(portfolio) && /event\.key === 'ArrowRight'/.test(portfolio) && /event\.key === 'ArrowLeft'/.test(portfolio)],
  ['gallery query failure does not discard project text', /images could not be loaded/i.test(loader) && /return rows\.map/.test(loader)],
  ['known unused Loader2 import removed from services page', !/^\s*import\s*\{[^}]*\bLoader2\b[^}]*\}\s*from\s*['"]lucide-react['"]/m.test(services)],
];
let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) failed++;
}
console.log(`\nPortfolio static checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
