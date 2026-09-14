import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('src');
const publicPages=fs.readdirSync(path.join(root,'pages')).filter(f=>f.endsWith('.tsx')&&!f.startsWith('admin'));
const files=[...publicPages.map(f=>path.join(root,'pages',f)),path.join(root,'components/layout/Header.tsx'),path.join(root,'components/layout/Footer.tsx')];
const report=[];
for(const file of files){
 const s=fs.readFileSync(file,'utf8');
 const images=(s.match(/https?:\/\/[^'"`\s)]+/g)||[]).filter(x=>/images\.|\.png|\.jpg|\.jpeg|\.webp/i.test(x));
 const literals=(s.match(/>\s*[A-Za-z][^<{\n]{3,120}\s*</g)||[]).map(x=>x.replace(/^>\s*|\s*</g,'').trim()).filter(x=>!['Loading...','Page not found.'].includes(x));
 const links=(s.match(/(?:href|to)\s*=\s*['"][^'"]+['"]/g)||[]);
 report.push({file:path.relative(process.cwd(),file).replaceAll('\\','/'),hardcodedText:literals.length,hardcodedImages:images.length,staticLinks:links.length});
}
const out=['# Public Site → Admin Coverage Audit 360','',`Generated: ${new Date().toISOString()}`,'','| File | Hard-coded text | Hard-coded images | Static links |','|---|---:|---:|---:|'];
for(const r of report) out.push(`| ${r.file} | ${r.hardcodedText} | ${r.hardcodedImages} | ${r.staticLinks} |`);
out.push('','## Interpretation','','- Product/service/catalog data is already CMS/database sourced.','- Header/footer navigation now prefers admin-managed navigation records with safe defaults.','- `/page/:slug` is the generic no-code page runtime.','- Remaining page-specific literals are preserved as intentional safe defaults and should be promoted into `site_content_registry` when business users need to edit them.','- External provider secrets remain deployment-only; provider metadata and feature flags belong in the admin control plane.');
fs.writeFileSync('docs/PUBLIC-SITE-ADMIN-COVERAGE-AUDIT-360.md',out.join('\n')+'\n');
console.log(`Audited ${report.length} public/layout files`);
