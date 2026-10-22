#!/usr/bin/env bash
# Starts PostgREST and the REAL Edge Functions (Deno). Only outside providers (Brevo, Africa's Talking, WhatsApp) are mocked.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; REPO="${E2E_REPO:-$(cd "$HERE/../.." && pwd)}"; WORK="${E2E_WORK:-/tmp/topline-e2e}"
DENO="${DENO_BIN:-deno}"; PGRST="${PGRST_BIN:-postgrest}"; export E2E_REPO="$REPO" E2E_WORK="$WORK" DENO_DIR="${DENO_DIR:-$WORK/deno_cache}"
up() { curl -s -m 2 -o /dev/null "http://127.0.0.1:$1/" 2>/dev/null; }
wait_for() { for _ in $(seq 1 40); do up "$1" && return 0; sleep 1; done; echo "service on port $1 did not start"; return 1; }
up 3000 || { setsid nohup "$PGRST" "$WORK/pgrst.conf" > "$WORK/postgrest.log" 2>&1 < /dev/null & wait_for 3000; }
up 8001 || { setsid nohup "$DENO" run -A --import-map="$HERE/import_map.json" "$HERE/wrapper.ts" > "$WORK/worker.log" 2>&1 < /dev/null & wait_for 8001; }
fn() { up "$2" || { n=$1; p=$2; shift 2; DENO_SERVE_ADDRESS="tcp:127.0.0.1:$p" setsid nohup "$DENO" run -A --import-map="$HERE/import_map.json" "$HERE/wrapper_fn.ts" "$n" "$@" > "$WORK/fn_$n.log" 2>&1 < /dev/null & wait_for "$p"; }; }
fn communication-provider-webhook 8002 COMMUNICATION_WEBHOOK_SECRET=e2e-webhook-secret
fn email-inbound 8003 EMAIL_INBOUND_SECRET=e2e-inbound-secret
fn operations-scheduler 8004 TOPLINE_WORKER_SECRET=e2e-worker-secret-value
echo "stack is up"
