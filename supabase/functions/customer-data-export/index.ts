import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.rpc('create_operational_data_export');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: error.message.includes('permission') ? 403 : 500, headers: { ...cors, 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
