import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const fail=(m)=>{console.error(`BLOCKED: ${m}`);process.exit(2);};
const required=(n)=>{const v=process.env[n]?.trim();if(!v)fail(`Missing required environment variable: ${n}`);return v;};
const uuid=(n)=>{const v=required(n);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))fail(`${n} must be a UUID`);return v;};
const amount=(n,allowZero=false)=>{const v=required(n);if(!/^\d{1,10}\.\d{2}$/.test(v)||Number(v)<0||(!allowZero&&Number(v)<=0))fail(`${n} must be ${allowZero?'a non-negative':'a positive'} amount with two decimals`);return v;};
if(process.env.TOPLINE_FINANCE_UAT_ENV!=='staging')fail('TOPLINE_FINANCE_UAT_ENV=staging is required. Production finance testing is prohibited.');
if(process.env.TOPLINE_ALLOW_FINANCE_UAT!=='true')fail('Set TOPLINE_ALLOW_FINANCE_UAT=true only after approving a dedicated staging evidence check.');
const expectedRef=required('TOPLINE_FINANCE_STAGING_PROJECT_REF');
if(!/^[a-z0-9]{20}$/.test(expectedRef))fail('Staging project ref format is invalid.');
const config=fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8');
const canonicalRef=config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
if(!canonicalRef||canonicalRef===expectedRef)fail('G-11 UAT requires a separate staging project, not the canonical configured project.');
const linkPath=path.join(root,'supabase/.temp/project-ref');
if(!fs.existsSync(linkPath)||fs.readFileSync(linkPath,'utf8').trim()!==expectedRef)fail('Link the Supabase CLI to the same isolated staging project ref first.');
const dbUrl=required('TOPLINE_FINANCE_STAGING_DATABASE_URL');let parsed;
try{parsed=new URL(dbUrl);}catch{fail('Staging database URL is invalid.');}
if(!['postgres:','postgresql:'].includes(parsed.protocol)||parsed.hostname!==`db.${expectedRef}.supabase.co`)fail('Database URL must target db.<staging-ref>.supabase.co.');
const refundStatus=required('TOPLINE_G11_EXPECTED_REFUND_STATUS');if(!['successful','failed'].includes(refundStatus))fail('Expected refund status must be successful or failed.');
const values={
'__G11_ORDER_ID__':uuid('TOPLINE_G11_ORDER_ID'),
'__G11_PAYMENT_TRANSACTION_ID__':uuid('TOPLINE_G11_PAYMENT_TRANSACTION_ID'),
'__G11_REFUND_ID__':uuid('TOPLINE_G11_REFUND_ID'),
'__G11_INVOICE_ID__':uuid('TOPLINE_G11_INVOICE_ID'),
'__G11_EXPECTED_PAYMENT_AMOUNT__':amount('TOPLINE_G11_EXPECTED_PAYMENT_AMOUNT'),
'__G11_EXPECTED_REFUND_AMOUNT__':amount('TOPLINE_G11_EXPECTED_REFUND_AMOUNT'),
'__G11_EXPECTED_INVOICE_PAID__':amount('TOPLINE_G11_EXPECTED_INVOICE_PAID',true),
'__G11_EXPECTED_REFUND_STATUS__':refundStatus,
'__G11_PROVIDER_TRANSACTION_ID__':required('TOPLINE_G11_PROVIDER_TRANSACTION_ID'),
'__G11_PROVIDER_REFUND_ID__':process.env.TOPLINE_G11_PROVIDER_REFUND_ID?.trim()||''
};
for(const k of ['__G11_PROVIDER_TRANSACTION_ID__','__G11_PROVIDER_REFUND_ID__'])if(values[k]&&!/^[A-Za-z0-9._:-]{1,200}$/.test(values[k]))fail(`${k} contains unsupported characters.`);
if(refundStatus==='successful'&&!values.__G11_PROVIDER_REFUND_ID__)fail('Successful refund requires TOPLINE_G11_PROVIDER_REFUND_ID.');
let sql=fs.readFileSync(path.join(root,'supabase/tests/g11_finance_ledger_live.sql'),'utf8');
for(const [k,v] of Object.entries(values))sql=sql.replaceAll(k,v);
if(/__G11_[A-Z0-9_]+__/.test(sql))throw new Error('Unresolved G-11 SQL template token.');
const dir=path.join(root,'artifacts/g11-finance-uat');fs.mkdirSync(dir,{recursive:true});
const sqlPath=path.join(dir,'g11-finance-ledger-live.sql');fs.writeFileSync(sqlPath,sql);
const sqlHash=crypto.createHash('sha256').update(sql).digest('hex');const started=new Date().toISOString();
const env={...process.env};delete env.TOPLINE_FINANCE_STAGING_DATABASE_URL;
env.PGHOST=parsed.hostname;env.PGPORT=parsed.port||'5432';env.PGUSER=decodeURIComponent(parsed.username);env.PGPASSWORD=decodeURIComponent(parsed.password);env.PGDATABASE=decodeURIComponent(parsed.pathname.replace(/^\//,''))||'postgres';env.PGSSLMODE='require';
const res=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-f',sqlPath],{encoding:'utf8',windowsHide:true,timeout:120000,env});
const output=`started=${started}\nproject_ref=${expectedRef}\nsql_sha256=${sqlHash}\nexit_code=${res.status}\n${res.stdout||''}${res.stderr||''}`;
fs.writeFileSync(path.join(dir,'g11-finance-uat.log'),output);
const summary={status:res.status===0?'passed':'failed',environment:'staging',project_ref:expectedRef,started_at:started,finished_at:new Date().toISOString(),sql_sha256:sqlHash,fixture_ids:{order_id:values.__G11_ORDER_ID__,payment_transaction_id:values.__G11_PAYMENT_TRANSACTION_ID__,refund_id:values.__G11_REFUND_ID__,invoice_id:values.__G11_INVOICE_ID__},expected:{payment_amount:values.__G11_EXPECTED_PAYMENT_AMOUNT__,refund_amount:values.__G11_EXPECTED_REFUND_AMOUNT__,refund_status:refundStatus,invoice_paid:values.__G11_EXPECTED_INVOICE_PAID__},checks:['provider payment status, amount, currency and transaction identity','order payment/refund aggregate does not exceed payable totals','refund ties to exact payment/order and has expected provider outcome','refund outcome audit event exists','invoice payments sum to expected collection and invoice.amount_paid'],exit_code:res.status,error:res.error?.message||null,log:'g11-finance-uat.log'};
fs.writeFileSync(path.join(dir,'g11-finance-uat-summary.json'),JSON.stringify(summary,null,2)+'\n');
if(res.error)throw res.error;if(res.status!==0)process.exit(res.status||1);
console.log('G-11 staging finance ledger reconciliation evidence PASSED. See artifacts/g11-finance-uat/.');
