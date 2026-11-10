import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const reliability=fs.readFileSync("src/pages/admin/reliability-operations-360.tsx","utf8");
const health=fs.readFileSync("src/pages/admin/system-health.tsx","utf8");
const migration=fs.readFileSync("supabase/migrations/20260913090000_082_reliability_observability_incident_response_360.sql","utf8");
const checks=[
["Incident table is protected by RLS and direct table grants revoked",/ENABLE ROW LEVEL SECURITY/.test(migration)&&/REVOKE ALL ON public\.operational_incidents FROM PUBLIC, anon, authenticated/.test(migration)],
["Incident mutations require staff permission",/private\.require_staff_permission\('settings','update'\)/.test(migration)],
["Incident read snapshot requires report permission",/private\.require_staff_permission\('reports','select'\)/.test(migration)],
["Incident resolution requires summary",/Resolution summary is required/.test(migration)],
["Resolved incidents cannot be reopened",/v_current\.status='resolved' AND p_status <> 'resolved'/.test(migration)],
["Reliability page keeps explicit load error state",reliability.includes("const [loadError, setLoadError] = useState('')")&&reliability.includes("Reliability data could not be loaded.")],
["Reliability page offers retry after read failure",reliability.includes("onClick={() => void load()}")&&reliability.includes("Try again")],
["Failed read does not render false zero incident metrics",reliability.includes("loading || loadError || !data ? '—'")],
["Empty incident state requires successful snapshot",reliability.includes("data && !loadError && !loading ?")],
["System health label does not claim entire platform operational",health.includes("Database health snapshot available")&&!health.includes(">Platform operational<")],
["System health explains external-provider limitation",health.includes("does not certify external providers")],
["Existing Operation 10 verifier remains registered",typeof pkg.scripts["verify:operation-10-reliability-incident-response"]==="string"]
];
const failed=checks.filter(x=>!x[1]);
console.log(JSON.stringify({certification:"G-17 Reliability source certification",passed:checks.length-failed.length,total:checks.length,failed:failed.map(x=>x[0]),checks:checks.map(([name,passed])=>({name,passed}))},null,2));
if(failed.length)process.exit(1);
