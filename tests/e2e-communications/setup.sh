#!/usr/bin/env bash
# Builds the isolated test database from every migration and prepares the PostgREST config. Never touches production.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; REPO="${E2E_REPO:-$(cd "$HERE/../.." && pwd)}"
WORK="${E2E_WORK:-/tmp/topline-e2e}"; DB="${E2E_DB:-topline_e2e}"; PSQL="${E2E_PSQL:-psql -U postgres -h 127.0.0.1}"
mkdir -p "$WORK"
$PSQL -d postgres -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
$PSQL -d "$DB" -q -f "$REPO/scripts/local-db/supabase-shim.sql" >/dev/null 2>&1 || true   # roles may already exist in the cluster
n=0; for f in $(ls "$REPO"/supabase/migrations/*.sql | sort); do n=$((n+1)); $PSQL -d "$DB" -q -v ON_ERROR_STOP=1 -1 -f "$f" >/dev/null || { echo "Migration failed: $f"; exit 1; }; done
echo "applied $n migrations to $DB"
$PSQL -d "$DB" -q -f "$HERE/support.sql"
E2E_WORK="$WORK" node "$HERE/mint-jwts.mjs"
cat > "$WORK/pgrst.conf" <<CONF
db-uri = "postgres://authenticator:pgrst_e2e_pw@${E2E_PG_HOST:-127.0.0.1}:${E2E_PG_PORT:-5432}/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "e2e-test-jwt-secret-at-least-32-characters-long!!"
server-host = "127.0.0.1"
server-port = 3000
db-use-legacy-gucs = true
log-level = "warn"
CONF
echo "setup complete"
