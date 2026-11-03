import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = process.cwd();
const node = process.execPath;
function run(file, env) {
  return spawnSync(node, [file], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 15000 });
}

// Destructive local database reset must stop before invoking Supabase CLI.
{
  const result = run('scripts/validate-local-supabase.mjs', { TOPLINE_ALLOW_LOCAL_DB_RESET: '' });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /No Supabase CLI command was executed/);
}

// Payment webhook UAT must reject the known production hostname before network I/O.
{
  const result = run('scripts/verify-payment-provider-uat.mjs', {
    PAYMENT_WEBHOOK_URL: 'https://toplinefloorandwaterproofing.co.ke/functions/v1/payment-webhook',
    PAYMENT_WEBHOOK_SECRET: 'test-secret',
    PAYMENT_UAT_ORDER_ID: 'uat-order-only',
    PAYMENT_UAT_ALLOW_MUTATION: 'true',
    PAYMENT_UAT_ENV: 'staging',
    PAYMENT_UAT_EXPECTED_HOST: 'toplinefloorandwaterproofing.co.ke'
  });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /known production host/);
}

// M-Pesa initiation UAT must also reject the known production hostname.
{
  const result = run('scripts/verify-mpesa-provider-uat.mjs', {
    PAYMENT_INITIATE_URL: 'https://toplinefloorandwaterproofing.co.ke/functions/v1/payment-initiate',
    PAYMENT_UAT_ORDER_ID: 'uat-order-only',
    PAYMENT_UAT_EMAIL: 'uat@example.invalid',
    PAYMENT_UAT_PHONE: '+254700000000',
    MPESA_UAT_ENV: 'staging',
    MPESA_UAT_EXPECTED_HOST: 'toplinefloorandwaterproofing.co.ke',
    MPESA_UAT_ALLOW_MUTATION: 'true'
  });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /known production host/);
}

// Service mutation mode must never be overrideable for the canonical production project.
{
  const result = run('scripts/e2e-service-upload-installation.mjs', {
    VITE_SUPABASE_URL: 'https://cvjmfplhdlfvqnnmzqcp.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
    E2E_RUN_MUTATIONS: 'true',
    E2E_EXPECTED_SUPABASE_URL: 'https://cvjmfplhdlfvqnnmzqcp.supabase.co',
    E2E_ALLOW_PRODUCTION_MUTATIONS: 'true'
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /permanently blocked against the canonical production/);
  assert.doesNotMatch(result.stdout, /Public services read/);
}

console.log('Release safety guard tests passed (4/4).');
