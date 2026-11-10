import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
const delivery=read('src/pages/admin/project-delivery-360.tsx');
const visits=read('src/pages/admin/site-visits.tsx');
const workforce=read('src/pages/admin/installation-workforce.tsx');
const cases=read('src/pages/admin/service-cases.tsx');
const field=read('src/lib/field-operations.ts');
const deliverySql=read('supabase/migrations/20260910150000_project_delivery_field_operations.sql');
const workforceSql=read('supabase/migrations/20260911130000_045_installation_workforce.sql');
const serviceSql=read('supabase/migrations/20260911150000_047_warranty_after_sales.sql');
const qualitySql=read('supabase/migrations/20260912220000_071_service_quality_warranty_feedback_360.sql');
const checks=[
 ['Project delivery workspace is present',exists('src/pages/admin/project-delivery-360.tsx')&&exists('src/pages/admin/project-delivery.tsx')],
 ['Site visit scheduling workspace is present',exists('src/pages/admin/site-visits.tsx')],
 ['Installation workforce workspace is present',exists('src/pages/admin/installation-workforce.tsx')],
 ['After-sales support case workspace is present',exists('src/pages/admin/service-cases.tsx')],
 ['Project closeout requires complete progress',delivery.includes('Number(record.project?.progress_percentage || 0) === 100')],
 ['Project closeout requires no open issues or tasks',delivery.includes('recordIssues === 0 && recordTasks === 0')],
 ['Project closeout requires completed installation and quality clearance',delivery.includes("latestRecordInstallation === 'completed'")&&delivery.includes("['passed','waived'].includes(latestRecordQuality)")],
 ['Project closeout requires customer signoff',delivery.includes('!!record.signoff?.approved')],
 ['Project closeout KPI uses the same predicate',delivery.includes('rows.filter(isReadyToClose).length')],
 ['Project execution mutations use authenticated RPCs',deliverySql.includes('CREATE OR REPLACE FUNCTION public.complete_project_with_signoff')&&deliverySql.includes('GRANT EXECUTE ON FUNCTION public.complete_project_with_signoff')],
 ['Project measurements are persisted through RPC',deliverySql.includes('FUNCTION public.record_project_measurement')],
 ['Project material allocation has an inventory movement contract',deliverySql.includes('inventory_movements')&&deliverySql.includes('FUNCTION public.allocate_project_material')],
 ['Site visit scheduling checks project insert permission',visits.includes('createSiteVisit')&&read('supabase/migrations/20261107190000_phase_17_site_visit_execution_integrity.sql').includes("current_user_has_permission('projects','insert')")],
 ['Site visit completion and cancellation controls are exposed',visits.includes("setStatus(v.id,'completed')")&&visits.includes("setStatus(v.id,'cancelled')")],
 ['Site visit status transition is row-locked',read('supabase/migrations/20261107190000_phase_17_site_visit_execution_integrity.sql').includes('FOR UPDATE')],
 ['Installation assignments require active staff',workforceSql.includes('staff_profiles WHERE user_id=p_staff_user_id AND is_active=true')],
 ['Installation assignment is unique per staff member and installation',workforceSql.includes('UNIQUE (installation_id, staff_user_id)')],
 ['Installation status transition locks installation row',workforceSql.includes('WHERE id=p_installation_id FOR UPDATE')],
 ['Completed installation cannot be reopened',workforceSql.includes("v_current='completed' AND p_status <> 'completed'")],
 ['Installation page exposes assignment and execution actions',workforce.includes('assignInstallationStaff')&&workforce.includes("updateInstallationStatus(selected.id,'in_progress')")&&workforce.includes("updateInstallationStatus(selected.id,'completed')")],
 ['Installation workforce read errors remain visible with retry',workforce.includes('setLoadError')&&workforce.includes('role="alert"')&&workforce.includes('Try again')],
 ['Service case creation enforces customer identity and required issue details',serviceSql.includes('public.get_current_customer_id()')&&serviceSql.includes('Issue title and description are required')],
 ['Service case transitions are row-locked and terminal close is protected',serviceSql.includes('WHERE id=p_case_id FOR UPDATE')&&serviceSql.includes("v_status='closed' AND p_status <> 'closed'")],
 ['Service case staff updates require customer update permission',serviceSql.includes("require_staff_permission('customers','update')")],
 ['Service operations read errors remain visible with retry',cases.includes('setLoadError')&&cases.includes('role="alert"')&&cases.includes('Try again')],
 ['Warranty entitlement is derived by server-side function',qualitySql.includes('FUNCTION public.refresh_service_case_warranty_360')],
 ['SLA reconciliation is available to staff-authorized operations',qualitySql.includes('FUNCTION public.reconcile_service_case_slas_360')&&qualitySql.includes("require_staff_permission('customers','update')")],
 ['Customer feedback is limited to resolved or closed cases and own customer',qualitySql.includes("v_case.status NOT IN ('resolved','closed')")&&qualitySql.includes('v_customer <> v_case.customer_id')],
 ['Customer feedback rating is constrained to 1–5',qualitySql.includes('p_rating < 1 OR p_rating > 5')],
 ['Feedback duplicate submission is rejected',qualitySql.includes('unique_violation')&&qualitySql.includes('Feedback has already been submitted')],
 ['Service cases and feedback have RLS and restricted anonymous access',serviceSql.includes('ALTER TABLE public.service_cases ENABLE ROW LEVEL SECURITY')&&qualitySql.includes('ALTER TABLE public.service_case_feedback ENABLE ROW LEVEL SECURITY')&&qualitySql.includes('REVOKE ALL ON public.service_case_feedback FROM anon, authenticated')],
 ['Field operations and support mutation wrappers exist',field.includes("supabase.rpc('update_installation_status'")&&exists('src/lib/service-cases-360.ts')&&exists('src/lib/service-quality-360.ts')],
 ['Staging runbook and evidence template are included',exists('docs/PROJECT-DELIVERY-SITE-VISIT-INSTALLATION-SUPPORT-UAT-RUNBOOK-2026-11-07.md')&&exists('docs/PROJECT-DELIVERY-UAT-EVIDENCE-TEMPLATE-2026-11-07.md')]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
console.log(`Project delivery / site visit / installation / support source UAT contract: ${checks.length-failed.length}/${checks.length} passed, ${failed.length} failed.`);
if(failed.length)process.exit(1);
