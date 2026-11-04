#!/usr/bin/env bash
# Builds a throw-away PostgreSQL with minimal Supabase stubs, applies every migration in order and runs the
# SQL regression tests. Needs PostgreSQL 14+ binaries (initdb, pg_ctl, psql). Usage: bash supabase/tests/local/run-local.sh
set -euo pipefail
PGBIN="${PGBIN:-$(dirname "$(ls /usr/lib/postgresql/*/bin/initdb | sort -V | tail -1)")}"
DIR="$(mktemp -d)"; PORT="${PGPORT:-5441}"; HERE="$(cd "$(dirname "$0")/../../.." && pwd)"
trap '"$PGBIN/pg_ctl" -D "$DIR/d" stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$PGBIN/initdb" -D "$DIR/d" -A trust >/dev/null && "$PGBIN/pg_ctl" -D "$DIR/d" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
P=("$PGBIN/psql" -h "$DIR" -p "$PORT" -d postgres -q -v ON_ERROR_STOP=1)
"${P[@]}" -f "$HERE/supabase/tests/local/supabase-stub.sql"
"${P[@]}" -c "create function public.rls_auto_enable() returns void language sql as 'select 1'"   # Supabase-managed helper
for f in $(ls "$HERE"/supabase/migrations/*.sql | sort); do "${P[@]}" -f "$f" >/dev/null || { echo "MIGRATION FAILED: $f"; exit 1; }; done
for t in security_regression public_surface_regression business_payment_accounts_regression channel_gated_claim_regression portfolio_privacy_regression portal_business_flow_regression registration_email_flow_regression automation_comms_regression order_flow_e2e_regression; do
  echo "== $t"; "${P[@]}" -f "$HERE/supabase/tests/$t.sql" | grep -E "ok 1|OK|not ok" ; done
