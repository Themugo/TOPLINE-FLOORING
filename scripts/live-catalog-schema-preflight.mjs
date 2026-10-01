/** Live Supabase catalog schema preflight. Read-only; never mutates data. */
import { readFileSync, existsSync } from 'node:fs';
function loadEnvFile(path) { if (!existsSync(path)) return; for (const raw of readFileSync(path,'utf8').split(/\r?\n/)) { const line=raw.trim(); if(!line||line.startsWith('#')) continue; const eq=line.indexOf('='); if(eq<1) continue; const k=line.slice(0,eq).trim(); let v=line.slice(eq+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); if(!(k in process.env)) process.env[k]=v; } }
loadEnvFile('.env.local'); loadEnvFile('.env');
const URL=(process.env.VITE_SUPABASE_URL||'').replace(/\/$/,''); const KEY=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'';
if(!URL||!KEY) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
const required=['id','name','slug','short_description','icon','features','is_active','display_order','image_url'];
const select=required.join(','); const res=await fetch(`${URL}/rest/v1/services?select=${select}&limit=1`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}}); const body=await res.text();
if(!res.ok){ if(/42703|column services\./i.test(body)){ console.error('LIVE CATALOG SCHEMA: OUT OF DATE'); console.error('The live services table is missing one or more current catalogue columns.'); console.error('Apply the local Supabase migration chain with: supabase db push'); console.error('Required service repair migration: 20260930170000_service_catalog_and_communications_worker_hardening.sql'); process.exit(1); } throw new Error(`${res.status} ${res.statusText}: ${body}`); }
console.log('LIVE CATALOG SCHEMA: PASS'); console.log(`- services contract readable: ${required.join(', ')}`);
