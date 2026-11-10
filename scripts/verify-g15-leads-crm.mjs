import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const checks=[];
const add=(name,ok,detail="")=>checks.push({name,passed:!!ok,detail});
const required=[
"verify:leads-end-to-end-360","verify:phase-15-crm-lifecycle","verify:phase-15-17-lifecycle-360"
];
for(const name of required)add(`Regression script registered: ${name}`,typeof pkg.scripts?.[name]==="string",pkg.scripts?.[name]||"missing");
const files=[
"src/pages/admin/leads.tsx","src/pages/admin/crm.tsx","src/components/leads/LeadList.tsx","src/components/leads/LeadForm.tsx",
"src/hooks/use-data.ts","src/lib/lifecycle.ts",
"supabase/migrations/20260912130100_062_sales_crm_360.sql",
"supabase/migrations/20260912170000_066_sales_project_lifecycle_360_hardening.sql",
"supabase/migrations/20261020110000_guest_to_registered_continuity_360.sql",
"scripts/verify-leads-end-to-end-360.mjs","scripts/verify-phase-15-crm-lifecycle.mjs"
];
for(const file of files)add(`CRM source retained: ${file}`,fs.existsSync(file));
const hook=fs.readFileSync("src/hooks/use-data.ts","utf8");
const list=fs.readFileSync("src/components/leads/LeadList.tsx","utf8");
const crm=fs.readFileSync("src/pages/admin/crm.tsx","utf8");
add("Lead load exposes loading/error/retry contract",fs.readFileSync("src/pages/admin/leads.tsx","utf8").includes("loading, error, refetch")&&hook.includes("const refetch = useCallback")&&fs.readFileSync("src/pages/admin/leads.tsx","utf8").includes("Retry"));
add("Lead search handles absent aliases safely",/lead\.customer_name \|\| lead\.name \|\| ''/.test(list));
add("CRM page surfaces data load errors",/CRM leads could not be loaded/.test(crm));
add("Conversion remains transactional server RPC",/convert_lead_to_customer/.test(fs.readFileSync("scripts/verify-phase-15-crm-lifecycle.mjs","utf8")));
const failed=checks.filter(x=>!x.passed);
console.log(JSON.stringify({certification:"G-15 Leads and CRM source certification",passed:checks.length-failed.length,total:checks.length,failed,checks},null,2));
if(failed.length)process.exit(1);
