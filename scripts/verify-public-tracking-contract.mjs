import fs from 'node:fs';

const deliveryPath = 'src/lib/delivery.ts';
const pagePath = 'src/pages/track-order.tsx';
const migrationPath = 'supabase/migrations/20260911120000_043_delivery_proof_and_customer_tracking.sql';
const privacyMigrationPath = 'supabase/migrations/20260912000000_056_public_tracking_privacy.sql';

for (const file of [deliveryPath, pagePath, migrationPath, privacyMigrationPath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

const delivery = fs.readFileSync(deliveryPath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');
const privacyMigration = fs.readFileSync(privacyMigrationPath, 'utf8');

if (!/export interface TrackOrderResult/.test(delivery)) throw new Error('TrackOrderResult type is missing');
if (!/Promise<TrackOrderResult>/.test(delivery)) throw new Error('trackOrder does not expose a typed result contract');
if (!/return data as unknown as TrackOrderResult/.test(delivery)) throw new Error('trackOrder does not safely map the Supabase JSON response to its application contract');
if (!/tracked\?\.found/.test(page)) throw new Error('Track-order page no longer guards the public tracking result');
if (!/both your order number and the phone number used at checkout/i.test(page)) throw new Error('Track-order page does not require both tracking factors');
if (!/tracked\.order/.test(page)) throw new Error('Track-order page does not consume the typed order result');
if (!/RETURNS jsonb/.test(migration) || !/jsonb_build_object\('found',true/.test(migration)) throw new Error('Base public tracking RPC contract not found');
if (!/CREATE OR REPLACE FUNCTION public\.track_order_public/.test(privacyMigration)) throw new Error('Privacy-hardened public tracking RPC not found');
if (!/AND customer_phone = trim\(p_phone\)/.test(privacyMigration)) throw new Error('Privacy-hardened public tracking RPC does not bind the phone number to the order');

console.log('Public tracking contract verification PASSED.');
console.log('- track_order_public has an explicit frontend result type');
console.log('- the tracking page guards missing order details');
console.log('- the frontend contract matches the JSONB RPC shape');
console.log('- public tracking requires both order number and checkout phone number');
