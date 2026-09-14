import crypto from 'node:crypto';

const endpoint = process.env.PAYMENT_WEBHOOK_URL;
const provider = (process.env.PAYMENT_PROVIDER || 'mpesa').trim().toLowerCase();
const secret = process.env.PAYMENT_WEBHOOK_SECRET;
const orderId = process.env.PAYMENT_UAT_ORDER_ID;
const amount = Number(process.env.PAYMENT_UAT_AMOUNT || '1');
const currency = process.env.PAYMENT_UAT_CURRENCY || 'KES';
const eventId = process.env.PAYMENT_UAT_EVENT_ID || `uat-${Date.now()}`;
const allowMutation = process.env.PAYMENT_UAT_ALLOW_MUTATION === 'true';

const fail = (m) => { console.error(`FAIL: ${m}`); process.exit(1); };
if (!endpoint) fail('PAYMENT_WEBHOOK_URL is required.');
if (!secret) fail('PAYMENT_WEBHOOK_SECRET is required.');
if (!orderId) fail('PAYMENT_UAT_ORDER_ID is required.');
if (!Number.isFinite(amount) || amount <= 0) fail('PAYMENT_UAT_AMOUNT must be positive.');
if (!allowMutation) fail('Set PAYMENT_UAT_ALLOW_MUTATION=true only for an isolated provider UAT order.');

const payload = {
  event_id: eventId,
  event_type: 'payment.success',
  status: 'success',
  amount,
  currency,
  order_id: orderId,
  provider_transaction_id: `uat-tx-${Date.now()}`,
  provider_reference: `uat-ref-${Date.now()}`,
};

const raw = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');

async function call(body, sig, ts = timestamp) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-payment-provider': provider,
      'x-payment-event-id': eventId,
      'x-payment-timestamp': ts,
      'x-payment-signature': `sha256=${sig}`,
    },
    body,
  });
}

const bad = await call(raw, '00'.repeat(32));
if (bad.status !== 401) fail(`Invalid-signature test expected HTTP 401, received ${bad.status}.`);
console.log('PASS: invalid signature rejected with HTTP 401.');

const good = await call(raw, signature);
if (!good.ok) fail(`Valid signed UAT webhook was rejected with HTTP ${good.status}: ${await good.text()}`);
const result = await good.json().catch(() => null);
if (!result?.success) fail(`Valid signed UAT webhook did not return success: ${JSON.stringify(result)}`);
console.log(`PASS: signed ${provider} payment UAT accepted: ${JSON.stringify(result)}`);

const replay = await call(raw, signature);
if (!replay.ok) fail(`Replay test was rejected with HTTP ${replay.status}.`);
const replayResult = await replay.json().catch(() => null);
if (!replayResult?.idempotent_replay) fail(`Replay test did not report idempotent_replay=true: ${JSON.stringify(replayResult)}`);
console.log('PASS: duplicate provider event is idempotent.');

console.log('Payment provider sandbox/live webhook UAT: PASSED');
