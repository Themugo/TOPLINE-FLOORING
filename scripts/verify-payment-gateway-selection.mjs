import fs from 'node:fs';

const component = fs.readFileSync('src/components/customer/CustomerPaymentMethods.tsx', 'utf8');
const cart = fs.readFileSync('src/pages/cart.tsx', 'utf8');
const portal = fs.readFileSync('src/pages/portal.tsx', 'utf8');
const smoke = fs.readFileSync('tests/smoke/checkout.interaction.test.tsx', 'utf8');

const checks = [
  ['payment selector accepts an exact gateway value', /gatewayValue\?: string \| null/.test(component)],
  ['radio selection is keyed by gateway, not only payment type', /checked=\{gatewayValue !== undefined \? gatewayValue === method\.gateway_key/.test(component)],
  ['selecting a payment option updates both method and gateway', /onChange\(method\.payment_method\); onGatewayChange\?\.\(method\.gateway_key\)/.test(component)],
  ['checkout passes the selected gateway back into the selector', /context="checkout" value=\{paymentMethod\} gatewayValue=\{paymentGatewayKey\}/.test(cart)],
  ['customer order and invoice payment flows pass their selected gateways', /context="order" value=\{orderPaymentMethod\} gatewayValue=\{orderPaymentGatewayKey\}/.test(portal) && /context="invoice" value=\{invoicePaymentMethod\} gatewayValue=\{invoicePaymentGatewayKey\}/.test(portal)],
  ['regression test covers two gateways sharing M-Pesa', smoke.includes("gateway_key: 'mpesa-backup'") && smoke.includes('uses the exact gateway selected when multiple gateways share one payment method')],
];

for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
const failed = checks.filter(([, passed]) => !passed);
console.log(`\n${checks.length - failed.length}/${checks.length} payment gateway selection checks passed`);
if (failed.length) process.exitCode = 1;
