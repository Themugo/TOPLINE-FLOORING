import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = process.cwd();
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
const uuid = (name) => {
  const value = required(name);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error(`${name} must be a UUID`);
  return value;
};
const fail = (message) => { console.error(`BLOCKED: ${message}`); process.exit(2); };

if (process.env.TOPLINE_SECURITY_UAT_ENV !== 'staging') fail('TOPLINE_SECURITY_UAT_ENV=staging is required. Production testing is prohibited.');
if (process.env.TOPLINE_ALLOW_SECURITY_UAT !== 'true') fail('Set TOPLINE_ALLOW_SECURITY_UAT=true only for an isolated disposable/staging project.');
const expectedRef = required('TOPLINE_SECURITY_STAGING_PROJECT_REF');
if (!/^[a-z0-9]{20}$/.test(expectedRef)) fail('Staging project ref has an invalid format.');
const config = fs.readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
const canonicalRef = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
if (!canonicalRef || expectedRef === canonicalRef) fail('Security UAT target must be a separate project, not the canonical project configured in supabase/config.toml.');
const linkPath = path.join(root, 'supabase', '.temp', 'project-ref');
if (!fs.existsSync(linkPath)) fail('No Supabase link file found. Link only the isolated staging project first.');
const linkedRef = fs.readFileSync(linkPath, 'utf8').trim();
if (linkedRef !== expectedRef) fail(`Linked project ref mismatch (expected ${expectedRef}, found ${linkedRef}).`);
const dbUrl = required('TOPLINE_SECURITY_STAGING_DATABASE_URL');
let parsed;
try { parsed = new URL(dbUrl); } catch { fail('TOPLINE_SECURITY_STAGING_DATABASE_URL is not a valid URL.'); }
if (parsed.hostname !== `db.${expectedRef}.supabase.co`) fail('Database URL host does not match the isolated staging project ref.');
if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) fail('Database URL must use PostgreSQL.');

const customerBCustomerId = uuid('TOPLINE_G08_CUSTOMER_B_CUSTOMER_ID');
const values = {
  '__G08_CUSTOMER_A_AUTH_ID__': uuid('TOPLINE_G08_CUSTOMER_A_AUTH_ID'),
  '__G08_CUSTOMER_B_AUTH_ID__': uuid('TOPLINE_G08_CUSTOMER_B_AUTH_ID'),
  '__G08_ORDER_B_ID__': uuid('TOPLINE_G08_CUSTOMER_B_ORDER_ID'),
  '__G08_PRIVATE_OBJECT__': required('TOPLINE_G08_CUSTOMER_B_PRIVATE_OBJECT_PATH')
};
if (values.__G08_CUSTOMER_A_AUTH_ID__ === values.__G08_CUSTOMER_B_AUTH_ID__) fail('Customer A and B auth IDs must differ.');
if (!/^[A-Za-z0-9/_-]{1,500}$/.test(values.__G08_PRIVATE_OBJECT__) || values.__G08_PRIVATE_OBJECT__.includes('..')) fail('Private object path contains unsupported characters.');
if (!values.__G08_PRIVATE_OBJECT__.startsWith(`${customerBCustomerId}/`)) fail('Private object path must begin with Customer B customer-record UUID followed by /.');

const templatePath = path.join(root, 'supabase', 'tests', 'g08_role_isolation_live.sql');
let sql = fs.readFileSync(templatePath, 'utf8');
for (const [token, value] of Object.entries(values)) sql = sql.replaceAll(token, value);
if (/__G08_[A-Z0-9_]+__/.test(sql)) throw new Error('Unresolved G-08 SQL template token.');
const artifactDir = path.join(root, 'artifacts', 'g08-security-uat');
fs.mkdirSync(artifactDir, { recursive: true });
const renderedSql = path.join(artifactDir, 'g08-role-isolation-live.sql');
fs.writeFileSync(renderedSql, sql);
const logPath = path.join(artifactDir, 'g08-security-uat.log');
const summaryPath = path.join(artifactDir, 'g08-security-uat-summary.json');
const manifest = crypto.createHash('sha256').update(sql).digest('hex');
const start = new Date().toISOString();
const childEnv = { ...process.env };
delete childEnv.TOPLINE_SECURITY_STAGING_DATABASE_URL;
childEnv.PGHOST = parsed.hostname;
childEnv.PGPORT = parsed.port || '5432';
childEnv.PGUSER = decodeURIComponent(parsed.username);
childEnv.PGPASSWORD = decodeURIComponent(parsed.password);
childEnv.PGDATABASE = decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'postgres';
childEnv.PGSSLMODE = 'require';
const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-f', renderedSql], { encoding: 'utf8', windowsHide: true, timeout: 120000, env: childEnv });
const output = `${result.stdout || ''}${result.stderr || ''}`;
fs.writeFileSync(logPath, `started=${start}\nproject_ref=${expectedRef}\nsql_sha256=${manifest}\nexit_code=${result.status}\n${output}`);
const summary = { status: result.status === 0 ? 'passed' : 'failed', environment: 'staging', project_ref: expectedRef, started_at: start, finished_at: new Date().toISOString(), sql_sha256: manifest, checks: ['sensitive-table RLS enabled','storage.objects RLS and policies','private-documents bucket non-public','worker RPC not executable by anon/authenticated','anonymous private-object denial','cross-customer order and object denial','customer-owned order and object positive control'], exit_code: result.status, error: result.error?.message || null, log: 'g08-security-uat.log' };
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log('G-08 live RLS/RPC/Storage role-isolation tests PASSED. Evidence: artifacts/g08-security-uat/');
