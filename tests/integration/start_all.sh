#!/bin/bash
pg_ctlcluster 16 main start 2>/dev/null; sleep 2
if ! curl -s -m 2 http://127.0.0.1:3001/ >/dev/null 2>&1; then
  (cd ${PGRST_DIR:-/tmp/pgrst} && setsid nohup ./postgrest pgrst.conf > pgrst.log 2>&1 < /dev/null &); sleep 3
fi
if ! curl -s -m 2 http://127.0.0.1:54321/__mock/calls >/dev/null 2>&1; then
  export SR_JWT=$(node /tmp/dbtest/jwt.mjs '{"role":"service_role"}') ANON_JWT=$(node /tmp/dbtest/jwt.mjs '{"role":"anon"}')
  (setsid nohup ${DENO_BIN:-deno} run -A --import-map=${IT_DIR:-/tmp/dbtest}/edge/import_map.json --no-lock ${IT_DIR:-/tmp/dbtest}/edge/harness.ts > ${IT_DIR:-/tmp/dbtest}/edge/harness.log 2>&1 < /dev/null &)
  for i in $(seq 1 30); do sleep 1; curl -s -m 1 http://127.0.0.1:54321/__mock/calls >/dev/null 2>&1 && break; done
fi
echo "services: pg=$(pg_lsclusters | tail -1 | awk '{print $4}') pgrst=$(curl -s -o /dev/null -w '%{http_code}' -m 2 http://127.0.0.1:3001/) harness=$(curl -s -o /dev/null -w '%{http_code}' -m 2 http://127.0.0.1:54321/__mock/calls)"
