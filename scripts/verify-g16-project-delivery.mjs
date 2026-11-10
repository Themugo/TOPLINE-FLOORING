import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const page=fs.readFileSync("src/pages/admin/project-delivery-360.tsx","utf8");
const migration=fs.readFileSync("supabase/migrations/20260913020000_075_project_delivery_360.sql","utf8");
const checks=[
["Existing delivery 360 RPC migration retained",migration.includes("get_project_delivery_360")&&migration.includes("complete_project_with_signoff")],
["Project delivery admin page retained",fs.existsSync("src/pages/admin/project-delivery-360.tsx")],
["Delivery data load failure is surfaced",page.includes("Project delivery data could not be loaded.")&&page.includes("role=\"alert\"")],
["Delivery data load supports explicit retry",page.includes("onClick={() => void load()}")],
["Ready-to-close KPI uses complete closeout criteria",page.includes('rows.filter(isReadyToClose).length')],
["Closeout requires 100 percent progress",page.includes("Number(record.project?.progress_percentage || 0) === 100")],
["Closeout requires zero open issues and tasks",page.includes("recordIssues === 0 && recordTasks === 0")],
["Closeout requires installation and quality clearance",page.includes("latestRecordInstallation === 'completed'")&&page.includes("['passed','waived'].includes(latestRecordQuality)")],
["Closeout requires customer signoff",page.includes("!!record.signoff?.approved")],
["Operation 2 verifier remains registered",typeof pkg.scripts["verify:operation-2-project-delivery"]==="string"],
["Project document verifier remains registered",typeof pkg.scripts["verify:project-documents"]==="string"],
["Phase 16 quotation/project verifier remains registered",typeof pkg.scripts["verify:phase-16-quotation-order-project"]==="string"],
["Phase 17 site visit verifier remains registered",typeof pkg.scripts["verify:phase-17-site-visit-execution"]==="string"]
];
const failed=checks.filter(x=>!x[1]);
console.log(JSON.stringify({certification:"G-16 Project Delivery source certification",passed:checks.length-failed.length,total:checks.length,failed:failed.map(x=>x[0]),checks:checks.map(([name,passed])=>({name,passed}))},null,2));
if(failed.length)process.exit(1);
