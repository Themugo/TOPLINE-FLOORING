import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const pass = (label, ok) => ok ? console.log(`PASS ${label}`) : failures.push(label);

const cms = read('src/lib/cms-service.ts');
const defaults = read('src/lib/cms-defaults.ts');
const templates = read('src/components/admin/ProjectTemplateLibrary.tsx');
const notifications = read('src/components/admin/AdminNotificationCenter.tsx');
const templateMigration = read('supabase/migrations/20261001090000_project_template_persistence_360.sql');
const phase1 = read('docs/PHASE_1_LAUNCH_GAP_AUDIT.md');

pass('Phase 1 launch-gap runbook exists', phase1.includes('Phase 1 — Topline Launch Gap Audit'));
pass('CMS fails closed when Supabase is unavailable', cms.includes("throw new Error('CMS database is not configured"));
pass('CMS query errors are not replaced by demo defaults', cms.includes('CMS content could not be loaded from Supabase'));
pass('CMS mutations persist before updating local cache', cms.indexOf("supabase.from('site_settings').upsert") >= 0 && cms.indexOf('cmsStoreCache[groupKey] = groupData') > cms.indexOf("supabase.from('site_settings').upsert"));
pass('unsupported public CMS statistics are not embedded', !/500\s*\+|2\.5M|99\.4%/.test(defaults));
pass('fictional public project map records are not embedded', !defaults.includes('Central Metro Commercial Plaza') && !defaults.includes('Metropolis'));
pass('project templates no longer use browser persistence', !templates.includes('project_templates_cache') && !templates.includes('localStorage'));
pass('custom project templates use canonical Supabase persistence', templates.includes("from('project_templates')"));
pass('project template table has RLS', templateMigration.includes('ENABLE ROW LEVEL SECURITY'));
pass('project template writes require project permissions', templateMigration.includes("private.current_user_has_permission('projects','insert')") && templateMigration.includes("private.current_user_has_permission('projects','update')"));
pass('project template delete requires project permission', templateMigration.includes("private.current_user_has_permission('projects','delete')"));
pass('notification center does not use browser business persistence', !notifications.includes('template_admin_notifications') && !notifications.includes('localStorage'));
pass('notification center uses server-derived operational alerts', notifications.includes('generateAlertNotifications(projects)'));
pass('notification center does not claim provider delivery', !notifications.includes('Dispatch Alert Email'));
pass('fake CRM alert is removed', !notifications.includes('Metropolitan Logistics Hub') && !notifications.includes('lead-101'));

if (failures.length) {
  console.error(`FAILED ${failures.length}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Phases 1-7 hardening static gate passed.');
