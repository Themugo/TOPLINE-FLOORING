import { execSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { WORK, DB, PSQL, JWT_SECRET, PORTS, SECRETS } from './config.mjs';
export const W = `http://127.0.0.1:${PORTS.worker}/`, C = `http://127.0.0.1:${PORTS.control}`, R = `http://127.0.0.1:${PORTS.postgrest}`;
export const SERVICE = fs.readFileSync(`${WORK}/service.jwt`, 'utf8').trim();
export const ANON = fs.readFileSync(`${WORK}/anon.jwt`, 'utf8').trim();
export const SECRET = SECRETS.worker;
export const sql = (q) => execSync(`${PSQL} -d ${DB} -At -F'|' -v ON_ERROR_STOP=1`, { input: q, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
export const rows = (q) => sql(q).split('\n').filter(Boolean).map((l) => l.split('|'));
export const worker = async (limit = 10, headers = {}) => { const r = await fetch(W, { method: 'POST', headers: { 'x-topline-worker-secret': SECRET, 'content-type': 'application/json', ...headers }, body: JSON.stringify({ limit }) }); return { status: r.status, body: await r.json().catch(() => null) }; };
export const calls = async () => (await fetch(C + '/calls')).json();
export const reset = async () => fetch(C + '/reset');
export const scenario = async (p) => (await fetch(C + '/scenario?' + new URLSearchParams(p))).json();
export const rpc = async (name, args = {}, jwt = ANON) => { const r = await fetch(`${R}/rpc/${name}`, { method: 'POST', headers: { apikey: jwt, Authorization: `Bearer ${jwt}`, 'content-type': 'application/json' }, body: JSON.stringify(args) }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
export const rest = async (method, path, jwt = ANON, body) => { const r = await fetch(`${R}/${path}`, { method, headers: { apikey: jwt, Authorization: `Bearer ${jwt}`, 'content-type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const userJwt = (sub, email) => { const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64({ role: 'authenticated', sub, email, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 }); return `${h}.${p}.${crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`; };
const RES = `${WORK}/results.json`;
export const results = fs.existsSync(RES) ? JSON.parse(fs.readFileSync(RES, 'utf8')) : [];
export function record(id, path, name, layer, pass, evidence) {
  const i = results.findIndex((r) => r.id === id); const row = { id, path, name, layer, result: pass ? 'PASS' : 'FAIL', evidence: String(evidence).slice(0, 400) };
  if (i >= 0) results[i] = row; else results.push(row);
  fs.writeFileSync(RES, JSON.stringify(results, null, 1));
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}${pass ? '' : '\n      -> ' + row.evidence}`);
}
export const resetDb = () => sql(`SET client_min_messages=warning; TRUNCATE public.communication_delivery_attempts, public.communication_provider_events, public.communication_outbox, public.notification_events, public.brevo_marketing_sync_queue, public.communication_suppressions, public.quotations, public.leads RESTART IDENTITY CASCADE;`);
