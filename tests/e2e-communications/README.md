# TOPLINE end-to-end communications harness

Runs the **real** Edge Function source and the **real** database against each other, with only the outside world mocked.
It exists so that "the email would be sent" can be checked by executing the code, not by reading it.

## What is real and what is mocked

| Layer | In this harness |
|---|---|
| PostgreSQL schema, triggers, RPCs, RLS, grants | **Real**: every file in `supabase/migrations/` applied to an empty database |
| REST layer (what the browser talks to) | **Real PostgREST** with genuine signed JWTs (anonymous, customer, staff, service role) |
| `deliver-communications`, `communication-provider-webhook`, `email-inbound`, `operations-scheduler` | **Real source**, unmodified, run in Deno |
| Brevo email + contacts, Africa's Talking SMS, WhatsApp Graph API | **Mocked** (`wrapper.ts`). Records every message it would have sent and can simulate rejection, rate limits, outages, timeouts and "accepted but the response was lost" |
| Supabase Auth (GoTrue): sign-up, confirmation email, links, sessions | **Not run.** Tests reproduce what GoTrue does to the database (insert into `auth.users`, then set `email_confirmed_at`) |
| Real inbox delivery, DNS (SPF/DKIM/DMARC), provider dashboards | **Not covered.** See `TOPLINE-PRODUCTION-EMAIL-CHECKLIST.md` |

A passing run therefore proves the application's own behaviour end to end. It does **not** prove that Brevo delivers to a
real mailbox or that Supabase Auth emails are configured. Never point this at a production database.

## Prerequisites (Linux, macOS or WSL)

* PostgreSQL 15+ with a superuser you can reach (a throwaway local instance is ideal)
* Node 20+
* [Deno](https://deno.com) 2.x
* [PostgREST](https://github.com/PostgREST/postgrest/releases) 12.x

## Run

```bash
export E2E_PSQL="psql -U postgres -h 127.0.0.1"   # how to reach PostgreSQL as a superuser (add PGPASSWORD if needed)
export PGRST_BIN=/path/to/postgrest DENO_BIN=/path/to/deno
cd tests/e2e-communications
./setup.sh        # builds database "topline_e2e" from every migration (replaces it if present)
./start.sh        # starts PostgREST and the real Edge Functions
node run-all.mjs  # runs every numbered test file; exit code 1 if anything fails
```

Optional variables: `E2E_DB` (default `topline_e2e`), `E2E_WORK` (default `/tmp/topline-e2e`, holds logs, JWTs and
`results.json`), `E2E_REPO`, `E2E_PG_HOST`, `E2E_PG_PORT`. Total run time is a few minutes because three tests deliberately
wait out the worker's 20-second provider timeout.

Stop the services with `pkill -f postgrest; pkill -f "deno run"`.

## What each file covers

| File | Covers |
|---|---|
| `01-quotation-and-worker.mjs` | Worker authentication, public quotation form to outbox to provider, duplicate and throttle protection |
| `02-orders-and-notifications.mjs` | Guest order confirmation on email/SMS/WhatsApp, status updates, preferences, suppression, every notification rule renders |
| `03-delivery-failures.mjs` | Permanent and transient provider errors, retry exhaustion, crash recovery, concurrency, **ambiguous timeouts never re-sent**, staff re-queue |
| `04-registration-consent-continuity.mjs` | Post-sign-up linking, marketing consent through the real worker, opt-out ordering, guest-to-registered continuity |
| `05-authorization.mjs` | Cross-customer isolation, forged ids, staff-only RPCs, anonymous access, mass-assignment at registration |
| `06-webhooks-and-inbound.mjs` | Webhook secret checks, delivery correlation, replay and out-of-order events, bounces, inbound email bounds |
| `07-scheduler.mjs` | Scheduler authentication, job chain, overlapping runs, crashed-run lock recovery |
| `08-payment-notification.mjs` | Payment-received notification |
| `09-notification-status-guard.mjs` | Customers are not sent internal pipeline states or draft invoices |

Each assertion prints `PASS`/`FAIL` with its evidence and is written to `results.json`.
