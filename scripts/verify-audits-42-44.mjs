import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
'supabase/migrations/20260911110000_042_order_delivery_lifecycle.sql',
'supabase/migrations/20260911120000_043_delivery_proof_and_customer_tracking.sql',
'src/lib/delivery.ts','src/pages/admin/deliveries.tsx'
];
for(const f of required) if(!fs.existsSync(path.join(root,f))) throw new Error(`Missing ${f}`);
const m42=fs.readFileSync(path.join(root,required[0]),'utf8');
const m43=fs.readFileSync(path.join(root,required[1]),'utf8');
for(const token of ['create_order_delivery','dispatch_order_delivery','advance_delivery_in_transit']) if(!m42.includes(token)) throw new Error(`Missing ${token}`);
for(const token of ['complete_order_delivery','track_order_public','proof_of_delivery_url']) if(!m43.includes(token)) throw new Error(`Missing ${token}`);
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8'); if(!app.includes("'/admin/deliveries'")) throw new Error('Delivery route not wired');
const track=fs.readFileSync(path.join(root,'src/pages/track-order.tsx'),'utf8'); if(!track.includes('trackOrder')) throw new Error('Secure tracking RPC not wired');
console.log('Phase 42–44 source verification passed.');
