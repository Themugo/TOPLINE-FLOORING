/**
 * End-to-end smoke test for the real Topline service + media + installation paths.
 *
 * Safe default: read-only contract checks.
 * Mutation mode requires:
 *   E2E_RUN_MUTATIONS=true
 *   E2E_ADMIN_EMAIL=...
 *   E2E_ADMIN_PASSWORD=...
 *
 * Mutation mode creates and cleans a temporary service + image and, when a
 * temporary installation can be created and removed safely, exercises:
 * scheduled -> in_progress -> completed plus staff assignment/removal.
 * It refuses to run mutations against the canonical production Supabase URL
 * unless E2E_ALLOW_PRODUCTION_MUTATIONS=true is explicitly set.
 */
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const RUN_MUTATIONS = process.env.E2E_RUN_MUTATIONS === 'true';
const ALLOW_PROD = process.env.E2E_ALLOW_PRODUCTION_MUTATIONS === 'true';
const EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';

const CANONICAL = 'https://zmbsskvnzjdaxuxlauyx.supabase.co';
const results = [];
function pass(name, detail = '') { results.push(['PASS', name, detail]); console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); }
function fail(name, detail) { results.push(['FAIL', name, detail]); console.error(`FAIL ${name} — ${detail}`); }
function skip(name, detail) { results.push(['SKIP', name, detail]); console.log(`SKIP ${name} — ${detail}`); }
function requireValue(value, label) { if (!value) throw new Error(`${label} is required`); }

async function request(path, options = {}, token = KEY) {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof Blob)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return data;
}

const png1x1 = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));

let accessToken = '';
let createdServiceId = '';
let createdServiceSlug = '';
let uploadedPath = '';
let tempInstallationId = '';
let assignmentId = '';

async function main() {
  requireValue(URL, 'VITE_SUPABASE_URL');
  requireValue(KEY, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (URL !== CANONICAL) fail('Supabase target', `Expected ${CANONICAL}, got ${URL}`);
  else pass('Supabase target', CANONICAL);

  let services;
  try {
    services = await request('/rest/v1/services?select=id,name,slug,is_active&limit=1', { method: 'GET' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/42703|column services\.slug does not exist/i.test(message)) {
      throw new Error(
        'Live Supabase schema is behind the local migration foundation: services.slug is missing. ' +
        'Apply the pending migration 20260930170000_service_catalog_and_communications_worker_hardening.sql ' +
        '(and subsequent migrations) with `supabase db push`, then rerun this E2E test.'
      );
    }
    throw error;
  }
  pass('Public services read', `${Array.isArray(services) ? services.length : 0} service row(s) readable`);

  const bucket = await request('/storage/v1/bucket/images', { method: 'GET' }).catch((e) => { throw new Error(`images bucket unavailable: ${e.message}`); });
  if (bucket?.name !== 'images') throw new Error('images bucket response is not canonical');
  pass('Images storage bucket exists', `public=${bucket.public}`);

  if (!RUN_MUTATIONS) {
    skip('Authenticated service create/upload/update/delete', 'Set E2E_RUN_MUTATIONS=true with E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD on a staging environment.');
    skip('Installation assignment/status lifecycle', 'Mutation mode is required to exercise secured RPCs.');
    return;
  }

  requireValue(EMAIL, 'E2E_ADMIN_EMAIL');
  requireValue(PASSWORD, 'E2E_ADMIN_PASSWORD');
  if (URL === CANONICAL && !ALLOW_PROD) throw new Error('Mutation mode is blocked against the canonical production Supabase project. Use staging or explicitly set E2E_ALLOW_PRODUCTION_MUTATIONS=true.');

  const session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  accessToken = session?.access_token;
  requireValue(accessToken, 'Supabase access token');
  pass('Staff authentication', EMAIL);

  const suffix = randomUUID().slice(0, 8);
  createdServiceSlug = `e2e-service-${suffix}`;
  const serviceName = `E2E Service ${suffix}`;
  const inserted = await request('/rest/v1/services?select=id,name,slug,image_url,is_active', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: serviceName, slug: createdServiceSlug, description: 'Temporary end-to-end verification service.', short_description: 'Temporary E2E test.', image_url: '', features: [], is_active: true, display_order: 9999 }),
  }, accessToken);
  createdServiceId = inserted?.[0]?.id;
  requireValue(createdServiceId, 'created service id');
  pass('Service creation', createdServiceSlug);

  uploadedPath = `services/e2e/${suffix}.png`;
  const uploadResponse = await fetch(`${URL}/storage/v1/object/images/${uploadedPath}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/png', 'x-upsert': 'false' },
    body: png1x1,
  });
  if (!uploadResponse.ok) throw new Error(`Storage upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
  pass('Service image upload', uploadedPath);

  const publicUrl = `${URL}/storage/v1/object/public/images/${uploadedPath}`;
  const imageResponse = await fetch(publicUrl);
  if (!imageResponse.ok) throw new Error(`Uploaded image is not publicly retrievable: ${imageResponse.status}`);
  pass('Uploaded image retrieval', `${imageResponse.status} ${imageResponse.headers.get('content-type') || ''}`);

  await request(`/rest/v1/services?id=eq.${createdServiceId}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ image_url: publicUrl }),
  }, accessToken);
  pass('Service image persistence', 'services.image_url updated');

  const verified = await request(`/rest/v1/services?id=eq.${createdServiceId}&select=id,slug,image_url`, { method: 'GET' }, accessToken);
  if (verified?.[0]?.image_url !== publicUrl) throw new Error('Persisted service image URL does not match uploaded object URL');
  pass('Service read-back', createdServiceSlug);

  const staff = await request('/rest/v1/staff_profiles?select=user_id,display_name,is_active&is_active=eq.true&limit=1', { method: 'GET' }, accessToken);
  if (!staff?.[0]) {
    skip('Installation RPC lifecycle', 'No active staff member is available for the isolated installation test.');
  } else {
    const installationNumber = `E2E-${suffix}`;
    const createdInstallation = await request('/rest/v1/installations?select=id,installation_number,status', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ installation_number: installationNumber, status: 'scheduled', notes: 'Temporary Topline E2E smoke test' }),
    }, accessToken);
    tempInstallationId = createdInstallation?.[0]?.id;
    requireValue(tempInstallationId, 'temporary installation id');
    const installation = createdInstallation[0];
    const worker = staff[0];
    pass('Temporary installation creation', installationNumber);
    const assigned = await request('/rest/v1/rpc/assign_installation_staff', {
      method: 'POST', body: JSON.stringify({ p_installation_id: installation.id, p_staff_user_id: worker.user_id, p_assignment_role: 'installer' }),
    }, accessToken);
    assignmentId = assigned?.assignment_id || '';
    pass('Installation staff assignment', installation.installation_number || installation.id);

    const inProgress = await request('/rest/v1/rpc/update_installation_status', {
      method: 'POST', body: JSON.stringify({ p_installation_id: installation.id, p_status: 'in_progress', p_notes: 'E2E smoke test' }),
    }, accessToken);
    if (inProgress?.status !== 'in_progress') throw new Error('Installation did not transition to in_progress');
    pass('Installation start transition');

    const completed = await request('/rest/v1/rpc/update_installation_status', {
      method: 'POST', body: JSON.stringify({ p_installation_id: installation.id, p_status: 'completed', p_notes: 'E2E smoke test complete' }),
    }, accessToken);
    if (completed?.status !== 'completed') throw new Error('Installation did not transition to completed');
    pass('Installation completion transition');
    if (assignmentId) {
      await request('/rest/v1/rpc/remove_installation_assignment', { method: 'POST', body: JSON.stringify({ p_assignment_id: assignmentId }) }, accessToken);
      pass('Installation assignment cleanup');
    }
    await request(`/rest/v1/installations?id=eq.${tempInstallationId}`, { method: 'DELETE' }, accessToken);
    pass('Temporary installation cleanup');
    tempInstallationId = '';
  }

  await request(`/rest/v1/services?id=eq.${createdServiceId}`, { method: 'DELETE' }, accessToken);
  pass('Temporary service cleanup');
  const deleteResponse = await fetch(`${URL}/storage/v1/object/images/${uploadedPath}`, {
    method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!deleteResponse.ok) throw new Error(`Storage cleanup failed: ${deleteResponse.status} ${await deleteResponse.text()}`);
  pass('Temporary image cleanup');
  createdServiceId = '';
  uploadedPath = '';
}

try {
  await main();
} catch (error) {
  fail('E2E smoke run', error instanceof Error ? error.message : String(error));
  // Best-effort cleanup if mutation mode failed after creating resources.
  if (accessToken && assignmentId) await request('/rest/v1/rpc/remove_installation_assignment', { method: 'POST', body: JSON.stringify({ p_assignment_id: assignmentId }) }, accessToken).catch(() => {});
  if (accessToken && tempInstallationId) await request(`/rest/v1/installations?id=eq.${tempInstallationId}`, { method: 'DELETE' }, accessToken).catch(() => {});
  if (accessToken && createdServiceId) await request(`/rest/v1/services?id=eq.${createdServiceId}`, { method: 'DELETE' }, accessToken).catch(() => {});
  if (accessToken && uploadedPath) await fetch(`${URL}/storage/v1/object/images/${uploadedPath}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${accessToken}` } }).catch(() => {});
}

const failed = results.filter(([status]) => status === 'FAIL');
console.log(`\nE2E summary: ${results.filter(([s]) => s === 'PASS').length} passed, ${results.filter(([s]) => s === 'SKIP').length} skipped, ${failed.length} failed.`);
if (failed.length) process.exit(1);
