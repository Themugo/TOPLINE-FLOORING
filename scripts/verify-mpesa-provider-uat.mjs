import fs from 'node:fs';
import path from 'node:path';

const endpoint = (process.env.PAYMENT_INITIATE_URL || '').trim();
const orderId = (process.env.PAYMENT_UAT_ORDER_ID || '').trim();
const email = (process.env.PAYMENT_UAT_EMAIL || '').trim().toLowerCase();
const phone = (process.env.PAYMENT_UAT_PHONE || '').trim();
const gatewayKey = (process.env.PAYMENT_UAT_GATEWAY_KEY || 'mpesa').trim();
const expectedAmount = Number(process.env.PAYMENT_UAT_EXPECTED_AMOUNT || '0');
const environment = (process.env.MPESA_UAT_ENV || '').trim().toLowerCase();
const expectedHost = (process.env.MPESA_UAT_EXPECTED_HOST || '').trim().toLowerCase();
const allowMutation = process.env.MPESA_UAT_ALLOW_MUTATION === 'true';
const timeoutSeconds = Number(process.env.MPESA_UAT_CALLBACK_TIMEOUT_SECONDS || '300');
const pollSeconds = Number(process.env.MPESA_UAT_POLL_INTERVAL_SECONDS || '5');
const fail = (message) => { console.error(`BLOCKED: ${message}`); process.exit(2); };

if (!endpoint || !orderId || !email || !phone) fail('Requires an isolated payment-initiate endpoint, test order UUID, test customer email and test phone.');
let initiateUrl;
try { initiateUrl = new URL(endpoint); } catch { fail('PAYMENT_INITIATE_URL must be an absolute URL.'); }
const blockedHosts = new Set(['toplinefloorandwaterproofing.co.ke', 'www.toplinefloorandwaterproofing.co.ke', 'cvjmfplhdlfvqnnmzqcp.supabase.co']);
if (blockedHosts.has(initiateUrl.hostname.toLowerCase())) fail('M-Pesa UAT cannot target a known production host.');
if (!['sandbox', 'staging', 'local'].includes(environment)) fail('MPESA_UAT_ENV must be sandbox, staging or local.');
if (!expectedHost || initiateUrl.host.toLowerCase() !== expectedHost) fail('MPESA_UAT_EXPECTED_HOST must exactly match the initiation endpoint host.');
if (environment === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(initiateUrl.hostname)) fail('Local UAT must target a loopback hostname.');
if (environment !== 'local' && initiateUrl.protocol !== 'https:') fail('Remote sandbox/staging UAT endpoints must use HTTPS.');
if (!allowMutation) fail('Set MPESA_UAT_ALLOW_MUTATION=true only after confirming this is a disposable sandbox/staging order.');
if (!Number.isFinite(expectedAmount) || expectedAmount <= 0 || !Number.isInteger(expectedAmount)) fail('PAYMENT_UAT_EXPECTED_AMOUNT must be a positive whole KES amount.');
if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 30 || timeoutSeconds > 900) fail('MPESA_UAT_CALLBACK_TIMEOUT_SECONDS must be between 30 and 900.');
if (!Number.isFinite(pollSeconds) || pollSeconds < 2 || pollSeconds > 30) fail('MPESA_UAT_POLL_INTERVAL_SECONDS must be between 2 and 30.');
if (!/\/functions\/v1\/payment-initiate\/?$/.test(initiateUrl.pathname)) fail('PAYMENT_INITIATE_URL must point to /functions/v1/payment-initiate.');

const statusUrl = new URL(initiateUrl);
statusUrl.pathname = statusUrl.pathname.replace(/payment-initiate\/?$/, 'payment-status');
statusUrl.search = '';
statusUrl.hash = '';
const startedAt = new Date().toISOString();
const evidence = {
  provider: 'mpesa', environment, endpoint_host: initiateUrl.host, order_id: orderId,
  expected_amount_kes: expectedAmount, started_at: startedAt, initiation: 'not_started',
  callback: 'pending', final_payment_status: 'pending', poll_count: 0,
};
const artifactDir = path.join(process.cwd(), 'artifacts', 'payment-provider-uat');
fs.mkdirSync(artifactDir, { recursive: true });
const summaryPath = path.join(artifactDir, `mpesa-uat-${Date.now()}.json`);
const writeEvidence = () => fs.writeFileSync(summaryPath, `${JSON.stringify(evidence, null, 2)}\n`);

try {
  const body = {
    target_type: 'order', target_id: orderId, email, phone, payment_method: 'mpesa',
    gateway_key: gatewayKey, idempotency_key: `mpesa-uat-${orderId}`,
  };
  const response = await fetch(initiateUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(`Payment initiation rejected: HTTP ${response.status}; ${result.error || 'no success response'}`);
  if (result.payment_method !== 'mpesa' || !result.attempt_id || !result.access_token) throw new Error('Unexpected initiation response; attempt credentials were not returned.');
  if (Number(result.amount) !== expectedAmount) throw new Error(`Amount mismatch: expected ${expectedAmount}, received ${result.amount}.`);
  evidence.initiation = 'accepted';
  evidence.attempt_id = result.attempt_id;
  evidence.payment_transaction_id = result.payment_transaction_id || null;
  evidence.amount_kes = Number(result.amount);
  evidence.initiated_at = new Date().toISOString();
  writeEvidence();
  console.log(`PASS: sandbox/staging STK initiation accepted for isolated order ${orderId}.`);
  console.log('Complete the STK prompt on the designated test phone. This script will wait for the actual provider callback to update payment-status.');

  const deadline = Date.now() + timeoutSeconds * 1000;
  let terminal = false;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
    const poll = await fetch(statusUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attempt_id: result.attempt_id, access_token: result.access_token }),
      signal: AbortSignal.timeout(15_000),
    });
    const status = await poll.json().catch(() => ({}));
    evidence.poll_count += 1;
    if (!poll.ok || !status.success) throw new Error(`Payment status polling failed: HTTP ${poll.status}; ${status.error || 'invalid response'}`);
    evidence.final_payment_status = String(status.status || 'unknown').toLowerCase();
    evidence.last_status_check_at = new Date().toISOString();
    evidence.provider_reference_present = Boolean(status.provider_reference);
    if (['successful', 'failed', 'reversed', 'refunded', 'partially_refunded'].includes(evidence.final_payment_status)) {
      terminal = true;
      evidence.callback = evidence.final_payment_status === 'successful' ? 'reconciled' : 'provider_result_failed';
      evidence.completed_at = new Date().toISOString();
      if (Number(status.amount) !== expectedAmount) throw new Error(`Persisted payment amount mismatch: expected ${expectedAmount}, received ${status.amount}.`);
      if (evidence.final_payment_status !== 'successful') throw new Error(`Provider callback reached a terminal non-success state: ${evidence.final_payment_status}.`);
      if (!status.provider_reference) throw new Error('Payment is successful but the provider receipt/reference is missing.');
      break;
    }
    writeEvidence();
  }
  if (!terminal) {
    evidence.callback = 'not_received_before_timeout';
    evidence.completed_at = new Date().toISOString();
    writeEvidence();
    throw new Error(`No terminal provider callback was reconciled within ${timeoutSeconds} seconds. Check Safaricom callback delivery and use the provider transaction-status recovery procedure; do not initiate another charge.`);
  }
  evidence.callback = 'reconciled';
  evidence.result = 'PASS';
  writeEvidence();
  console.log(`PASS: actual M-Pesa callback reconciled; payment status=${evidence.final_payment_status}; provider reference present.`);
  console.log(`Evidence: ${path.relative(process.cwd(), summaryPath)}`);
  console.log('Next: reconcile the provider portal transaction and separately test a provider retry/duplicate callback and a failed STK attempt.');
} catch (error) {
  evidence.result = 'BLOCKED_OR_FAILED';
  evidence.error = error instanceof Error ? error.message : String(error);
  evidence.completed_at = new Date().toISOString();
  writeEvidence();
  console.error(`BLOCKED/FAILED: ${evidence.error}`);
  console.error(`Evidence: ${path.relative(process.cwd(), summaryPath)}`);
  process.exitCode = 1;
}
