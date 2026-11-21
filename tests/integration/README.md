# Database and edge-function integration tests

These are **not** part of `npm test` / `verify:all` (they need PostgreSQL). They exist because static checks and unit tests
cannot show that the migrations apply together or that the money flows actually work. They found real defects that every
other check missed (a corrupted migration, quotation-converted orders with no order number, an unrecoverable duplicate
M-Pesa callback, customers told to "wait" after a mistyped phone number, raw status text in customer emails).

What they do:

1. **Replay all migrations** in order on a fresh PostgreSQL 16 (`bootstrap.sql` supplies minimal stand-ins for the Supabase
   platform: the `anon`/`authenticated`/`service_role` roles, `auth`, `storage`, `cron`, `net`, `vault`, and Supabase's
   default table privileges).
2. **Run business flows as real SQL**, as the right database role (anonymous customer, `service_role` backend, staff):
   storefront order -> M-Pesa payment -> fulfilment -> delivery -> refund; quotation -> order -> project -> installation ->
   sign-off; site visits, service cases, maintenance; procurement and stock; invoices and payments; public site-settings
   access (RLS); payment expiry, late payments and the callback race; the scheduler.
3. **Run the real edge-function source** (`payment-initiate`, `payment-status`, `payment-callback`, `deliver-communications`,
   `operations-scheduler`) through `edge/harness.ts`, with PostgREST in front of the migrated database and **stand-ins for
   Safaricom and Brevo** (the only things replaced; the function code is unmodified).

## What this does NOT prove
It cannot prove anything about your real Safaricom, card-gateway or Brevo accounts, real phones, delivery to inboxes, or
your hosting. Do one live walk-through on staging with real credentials before taking real payments.

## Requirements (Linux, WSL or a CI runner)
PostgreSQL 16 running locally with an OS user `postgres`, the PostgREST binary (v12+), Deno 2, Node 20+, Python 3.

## Steps
```
export REPO=$PWD                         # the repository root
mkdir -p /tmp/dbtest && cp -r tests/integration/* /tmp/dbtest/
/tmp/dbtest/replay.sh topline1           # replays every migration; /tmp/dbtest/errors.log must stay empty
# start PostgREST (config: db-uri for role "authenticator", db-schemas public, jwt-secret as in jwt.mjs, port 3001),
# then the harness:  SR_JWT=... ANON_JWT=... deno run -A --import-map=/tmp/dbtest/edge/import_map.json --no-lock /tmp/dbtest/edge/harness.ts
python3 /tmp/dbtest/e2e_full.py          # order -> payment -> delivery -> refund
python3 /tmp/dbtest/e2e_proj.py          # project / installation / site visit / service case / maintenance
python3 /tmp/dbtest/e2e_fin.py           # invoices and payments
python3 /tmp/dbtest/edge_e2e.py          # real M-Pesa functions against the stand-in Safaricom
python3 /tmp/dbtest/comm1.py             # real communications worker against the stand-in Brevo
```
Scenario scripts print `PASS`/`FAIL` per check. They are written to be re-runnable on the same database (unique keys per run)
but a clean replay is the reliable baseline. `start_all.sh` shows how the services were started in the sandbox where this
was developed.
