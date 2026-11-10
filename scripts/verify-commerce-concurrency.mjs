import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (p) => fs.readFileSync(p, 'utf8');
const checkout = read('supabase/migrations/20261016120000_outbound_message_abuse_guards_360.sql');
const paymentAttempt = read('supabase/migrations/20261107110000_payment_initiation_atomic_reservation.sql');
const inventory = read('supabase/migrations/20261106130000_inventory_stock_adjustment_hardening.sql');
const delivery = read('supabase/migrations/20260912030000_059_fulfillment_operations_360.sql');
const fulfillment = read('supabase/migrations/20260913050000_078_fulfillment_delivery_control_360.sql');
const cancellation = read('supabase/migrations/20261107100000_order_fulfillment_finance_integrity.sql');
const base = read('supabase/migrations/20260911110000_042_order_delivery_lifecycle.sql');

const checks = [];
const check = (name, ok, detail='') => checks.push({name, passed:Boolean(ok), ...(detail ? {detail} : {})});
const between = (source, start, end) => {
  const a = source.indexOf(start);
  const b = end ? source.indexOf(end, a + start.length) : source.length;
  return a >= 0 ? source.slice(a, b < 0 ? source.length : b) : '';
};

const orderFn = between(checkout, 'CREATE OR REPLACE FUNCTION public.create_secure_customer_order', '$function$;');
const attemptFn = between(paymentAttempt, 'CREATE OR REPLACE FUNCTION public.create_payment_attempt_atomic_360', '$function$;');
const readinessFn = between(fulfillment, 'CREATE OR REPLACE FUNCTION public.check_order_fulfillment_readiness', '$$;');
const readyFn = between(fulfillment, 'CREATE OR REPLACE FUNCTION public.mark_order_ready_for_fulfillment', '$$;');
const createDeliveryFn = between(delivery, 'CREATE OR REPLACE FUNCTION public.create_order_delivery', '$$;');
const dispatchFn = between(delivery, 'CREATE OR REPLACE FUNCTION public.dispatch_order_delivery', '$$;');
const transitFn = between(delivery, 'CREATE OR REPLACE FUNCTION public.advance_delivery_in_transit', '$$;');
const completeFn = between(delivery, 'CREATE OR REPLACE FUNCTION public.complete_order_delivery', '$$;');

// Checkout and stock reservation serialization.
check('checkout aggregates duplicate product/variant cart lines before stock validation', /GROUP BY NULLIF\(item->>'product_id',''\)::uuid,[\s\S]*?SUM\(\(item->>'quantity'\)::numeric\)/.test(orderFn));
check('checkout locks parent product before reading active reservations', /FROM public\.products[\s\S]*?FOR UPDATE[\s\S]*?FROM public\.inventory_reservations/.test(orderFn));
check('variant checkout locks the exact active variant row', /FROM public\.product_variants[\s\S]*?product_id=v_group\.product_id[\s\S]*?is_active=true[\s\S]*?FOR UPDATE/.test(orderFn));
check('stock availability includes all unexpired active reservations', /r\.status='reserved'[\s\S]*?r\.expires_at > now\(\)/.test(orderFn));
check('checkout creates one reservation per aggregated product/variant group', /INSERT INTO public\.inventory_reservations[\s\S]*?v_group\.quantity,'reserved'/.test(orderFn));
check('checkout idempotency has a database unique index', /orders_checkout_idempotency_idx/.test(read('supabase/migrations/20260911160000_048_ecommerce_stability_foundation.sql')));
check('checkout handles concurrent same-key unique conflict by returning existing order', /WHEN unique_violation[\s\S]*?WHERE checkout_idempotency_key=trim\(p_idempotency_key\)[\s\S]*?idempotent_replay/.test(orderFn));
check('checkout idempotency replay binds the key to customer email and phone', /lower\(v_existing\.customer_email\)[\s\S]*?v_existing\.customer_phone/.test(orderFn));

// Payment attempts and inventory consumption.
check('payment attempt locks the payable order before balance checks', /FROM public\.orders WHERE id=p_target_id FOR UPDATE/.test(attemptFn));
check('payment attempt locks the payable invoice before balance checks', /FROM public\.invoices WHERE id=p_target_id FOR UPDATE/.test(attemptFn));
check('payment attempt returns existing attempt for matching idempotency replay', /WHERE idempotency_key=p_idempotency_key FOR UPDATE[\s\S]*?idempotency_replay/.test(attemptFn));
check('payment attempt blocks a second live online charge inside uncertainty window', /t\.status='pending'[\s\S]*?t\.method<>'bank_transfer'[\s\S]*?payment_in_progress/.test(attemptFn));
check('payment attempt and transaction rows are inserted atomically in one RPC', /INSERT INTO public\.payment_transactions[\s\S]*?INSERT INTO public\.payment_attempts/.test(attemptFn));
check('inventory payment-consumption function is present and locks the order', /CREATE OR REPLACE FUNCTION public\.record_order_payment_transaction/.test(inventory) && /WHERE id=p_order_id FOR UPDATE/.test(inventory));
check('inventory movement ledger retains product and variant identity', /variant_id/.test(inventory) && /inventory_movements/.test(inventory));

// Fulfilment transition serialization and terminal-state protection.
check('delivery creation locks the parent order before checking for an existing delivery', /FROM public\.orders WHERE id=p_order_id FOR UPDATE[\s\S]*?EXISTS \(SELECT 1 FROM public\.deliveries WHERE order_id=p_order_id\)/.test(createDeliveryFn));
check('database enforces one delivery per order under concurrent create requests', /deliveries_order_unique_idx/.test(base));
check('ready-for-fulfilment serializes access to the delivery row', /FROM public\.deliveries WHERE order_id=p_order_id FOR UPDATE/.test(readyFn));
check('dispatch locks delivery and only accepts pending/processing states', /FROM public\.deliveries WHERE id=p_delivery_id FOR UPDATE/.test(dispatchFn) && /status IN \('pending','processing'\)/.test(dispatchFn));
check('in-transit transition locks delivery and requires dispatched state', /FROM public\.deliveries WHERE id=p_delivery_id FOR UPDATE/.test(transitFn) && /status='dispatched'/.test(transitFn));
check('delivery completion locks delivery and requires dispatched/in-transit state plus proof', /FOR UPDATE/.test(completeFn) && /status IN \('in_transit','dispatched'\)/.test(completeFn) && /Proof of delivery note or URL is required/.test(completeFn));
check('cancellation locks order, blocks dispatched delivery cancellation and releases reservations once', /WHERE id=p_order_id FOR UPDATE/.test(cancellation) && /dispatched or completed delivery cannot be cancelled/.test(cancellation) && /status='reserved'/.test(cancellation));
check('fulfilment readiness requires fully paid order and converted reservation quantity', /payment_status,'pending'\) <> 'paid'/.test(readinessFn) && /status='converted'/.test(readinessFn));

const failed = checks.filter(x => !x.passed);
console.log(JSON.stringify({suite:'Commerce concurrent checkout, inventory and fulfilment source-contract tests',passed:checks.length-failed.length,total:checks.length,failed},null,2));
if (failed.length) process.exit(1);

if (process.argv.includes('--run-existing')) {
  const suite = [
    'verify:shop-cart-end-to-end','verify:cart-stock-eligibility','verify:commerce-fulfillment-360',
    'verify:ecommerce-stability','verify:order-payment-recovery','verify:payment-inventory-lifecycle',
    'verify:phase-2-product-inventory-hardening','verify:phase-3-cart-quotations-checkout',
    'verify:phase-4-order-fulfillment-finance','verify:phase-11-inventory-procurement-360',
    'verify:phase-19-order-confirmation-delivery'
  ];
  const pkg = JSON.parse(read('package.json'));
  let failures = 0;
  for (const name of suite) {
    const command = pkg.scripts?.[name];
    if (!command) { console.error(`Missing npm script: ${name}`); failures++; continue; }
    const [bin, ...args] = command.split(/\s+/);
    const result = spawnSync(bin,args,{stdio:'inherit',shell:process.platform==='win32'});
    if (result.status !== 0) { console.error(`FAILED: ${name}`); failures++; }
  }
  if (failures) process.exit(1);
}
