import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const fail=[]; const read=f=>fs.readFileSync(path.join(root,f),'utf8'); const exists=f=>fs.existsSync(path.join(root,f));
const migration='20260913220000_102_theme_brand_governance_360.sql';
if(!exists(`supabase/migrations/${migration}`)) fail.push('Operation 18 migration missing.');
else { const sql=read(`supabase/migrations/${migration}`); for(const t of ['theme_revisions','validate_theme_snapshot','publish_theme_settings','get_theme_governance_360','rollback_theme_settings','require_staff_permission']) if(!sql.includes(t)) fail.push(`Migration missing control: ${t}`); }
for(const f of ['src/lib/theme-governance-360.ts','src/pages/admin/theme.tsx','src/components/ThemeApplier.tsx']) if(!exists(f)) fail.push(`Missing application file: ${f}`);
const theme=read('src/pages/admin/theme.tsx'); for(const t of ['publishThemeSettings','rollbackThemeSettings','Theme Governance','Restore this version']) if(!theme.includes(t)) fail.push(`Theme UI missing: ${t}`);
const applier=read('src/components/ThemeApplier.tsx'); for(const t of ['--theme-secondary','--theme-accent','--theme-body-font','--theme-heading-font','--theme-spacing']) if(!applier.includes(t)) fail.push(`Live token missing: ${t}`);
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d+_.+\.sql$/.test(f)).sort(); const versions=migrations.map(f=>f.split('_')[0]);
if(new Set(versions).size!==versions.length) fail.push('Duplicate migration timestamps detected.'); for(let i=1;i<versions.length;i++) if(versions[i-1]>=versions[i]) fail.push('Migration ordering is not strictly increasing.');
const manifest=read('supabase/MIGRATION_MANIFEST.md'); if(!manifest.includes(migration)) fail.push('Migration manifest missing Operation 18.'); if(!manifest.includes(`contains ${migrations.length} uniquely timestamped active migrations`)) fail.push(`Migration manifest count is stale; expected ${migrations.length}.`);
if(fail.length){console.error('Operation 18 Theme & Brand Governance 360 FAILED.'); fail.forEach(x=>console.error(`- ${x}`)); process.exit(1);} console.log(`Operation 18 Theme & Brand Governance 360: STRUCTURAL GATE PASSED (${migrations.length} migrations)`);
