// Shared configuration for the end-to-end communications harness. Everything is overridable by environment variable.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = process.env.E2E_REPO || path.resolve(HERE, '../..');
export const WORK = process.env.E2E_WORK || '/tmp/topline-e2e';
export const DB = process.env.E2E_DB || 'topline_e2e';
// Command prefix used to reach PostgreSQL as a superuser, e.g. "psql -U postgres -h 127.0.0.1" or "runuser -u postgres -- psql".
export const PSQL = process.env.E2E_PSQL || 'psql -U postgres -h 127.0.0.1';
export const JWT_SECRET = 'e2e-test-jwt-secret-at-least-32-characters-long!!';
export const PORTS = { postgrest: 3000, worker: 8000, control: 8001, webhook: 8002, inbound: 8003, scheduler: 8004 };
export const SECRETS = { worker: 'e2e-worker-secret-value', webhook: 'e2e-webhook-secret', inbound: 'e2e-inbound-secret' };
