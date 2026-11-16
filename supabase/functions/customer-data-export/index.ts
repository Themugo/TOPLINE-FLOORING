import { createClient } from 'npm:@supabase/supabase-js@2';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

// Staff-only operational export. Authorisation, auditing and the integrity hash live in the
// create_operational_data_export RPC, which runs as the signed-in user. CORS uses the shared helper so the apex and
// www domains and any TOPLINE_WEB_ORIGIN extras (comma separated) all work.
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonResponse(req, 405, { error: 'POST required' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(req, 401, { error: 'Unauthorized' });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.rpc('create_operational_data_export');
  if (error) return jsonResponse(req, error.message.includes('permission') ? 403 : 500, { error: error.message });

  return jsonResponse(req, 200, data as Record<string, unknown>);
});
