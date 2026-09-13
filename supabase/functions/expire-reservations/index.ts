import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const workerSecret = Deno.env.get('TOPLINE_WORKER_SECRET');
if (!workerSecret) throw new Error('Reservation expiry worker is not configured');
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (req.headers.get('x-topline-worker-secret') !== workerSecret) return new Response('Unauthorized', { status: 401 });
  const { data, error } = await supabase.rpc('expire_inventory_reservations');
  if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
  return Response.json({ success: true, expired: data });
});
