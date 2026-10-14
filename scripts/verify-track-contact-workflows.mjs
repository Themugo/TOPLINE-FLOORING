import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const tracking = read('src/pages/track-order.tsx');
const contact = read('src/pages/contact.tsx');
const delivery = read('src/lib/delivery.ts');
const commerce = read('src/lib/commerce.ts');
const privacySql = read('supabase/migrations/20260912000000_056_public_tracking_privacy.sql');
const rpcSql = read('supabase/migrations/20260914104315_110_customer_self_service_rpc_trust_boundary_360.sql');
const header = read('src/components/layout/Header.tsx');
const checks = [
  ['Track page uses established trackOrder client function', tracking.includes('trackOrder(normalizedOrder, checkoutPhone)') && delivery.includes("supabase.rpc('track_order_public'")],
  ['Tracking requires order reference and checkout phone', tracking.includes('if (!normalizedOrder || !checkoutPhone)') && privacySql.includes("AND customer_phone = trim(p_phone)")],
  ['Tracking does not query orders directly from browser', !tracking.includes("from('orders'") && !tracking.includes('from("orders"')],
  ['Tracking handles not-found and missing RPC payload', tracking.includes('!tracked?.found') && tracking.includes('!tracked.order')],
  ['Tracking displays order items and delivery data from RPC contract', tracking.includes('result.items.map') && tracking.includes('result.delivery.tracking_number')],
  ['Tracking displays safe contact and contact-form continuation', tracking.includes('href="/contact"') && tracking.includes('settings.contact?.phone')],
  ['Checkout confirmation still deep-links to tracking', read('src/pages/order-confirmation.tsx').includes('/track-order?order=${encodeURIComponent(summary.orderNumber)}')],
  ['Contact preserves submitQuotationRequest workflow', contact.includes('submitQuotationRequest({') && commerce.includes("supabase.rpc('submit_quotation_request'")],
  ['Quotation RPC continues creating both lead and quotation', rpcSql.includes('INSERT INTO public.leads') && rpcSql.includes('INSERT INTO public.quotations')],
  ['Contact blocks duplicate submission and validates fields', contact.includes('if (submitting) return') && contact.includes('clean.message.length > 5000')],
  ['Contact success and failure feedback are retained', contact.includes('Your message has been received') && contact.includes('We couldn\'t submit your message')],
  ['Contact channels are driven by configured site settings', contact.includes('settings.contact?.phone') && contact.includes('settings.contact?.email')],
  ['More navigation still retains tracking and contact destinations', header.includes("{ href: '/track-order', label: 'Track Order'") && header.includes("{ href: '/contact', label: 'Contact'")],
  ['Contact form has explicit accessible labels and bounded message', contact.includes('htmlFor="contact-name"') && contact.includes('htmlFor="contact-message"') && contact.includes('maxLength={5000}')],
  ['No unsupported 24-hour or free-assessment promise added', !contact.includes('24-Hour RFQ Turnaround') && !contact.includes('Free On-Site Assessments') && !contact.includes('24/7')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nTrack Order + Contact workflow checks: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
