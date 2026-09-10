import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: staff, error: staffError } = await supabase.rpc('get_current_staff_profile');
  if (staffError || !staff) return new Response(JSON.stringify({ error: 'Staff authorization required' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
  const tables = ['customers','orders','order_items','quotations','invoices','leads','suppliers','purchase_orders','purchase_order_items','warehouses','warehouse_stock','inventory_movements'];
  const result: Record<string, unknown[]> = {};
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(10000);
    if (error) return new Response(JSON.stringify({ error: `Export failed for ${table}: ${error.message}` }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    result[table] = data ?? [];
  }
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), tables: result }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
