# G-23 — External Production Release Evidence Pack

This pack is the controlled hand-off for evidence that cannot be established from source code.
It deliberately starts **NOT CERTIFIED**. Do not change that status by hand.

## How to collect evidence

1. Check out the exact release candidate commit in an authorised environment.
2. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, and
   `npm run test:g09-responsive-browser`. Retain the CI run URL and redacted logs.
3. Use the repository's guarded linked-Supabase read-only workflow. Review
   `supabase migration list --linked`, `supabase db push --dry-run --linked`, and
   `supabase db lint`. Do not use `db reset --linked`. Do not apply migrations until a
   separate written approval names the project, plan, window and rollback.
4. Capture Vercel deployment details for the exact commit, production environment parity,
   domain attachment, HTTPS, www redirect, SPA deep links, security headers and smoke tests.
5. Complete authentication, provider sandbox, communications and business UAT with the
   relevant owners. Keep payment activation disabled unless a real approved adapter and
   signature-verifying webhook are deployed.
6. Confirm web DNS changes do not alter mail records. Rehearse rollback to the previous web
   target and retain the old website and cPanel mail until sign-off.
7. Put redacted evidence files in this directory. Update the matching criterion in
   `release-evidence-register.json`: status `VERIFIED`, evidence_file as a relative path
   inside this directory, a concise evidence_summary, verifier/owner and UTC timestamp.
8. Run `npm run verify:g23-release-evidence`. The verifier rejects missing files,
   path traversal, empty evidence, missing ownership/timestamp, and unsupported statuses.
9. Do not mark a criterion VERIFIED from a plan, source verifier, screenshot of configuration
   without a successful test, or verbal assurance. Record a genuine blocker as BLOCKED and
   explain it in evidence_summary.

## Evidence hygiene

Never put passwords, API keys, service-role keys, access tokens, payment credentials,
customer records or unredacted personal data in this directory. Prefer CI run URLs,
redacted logs, exported DNS records with unrelated values redacted, signed UAT sheets,
and timestamped screenshots. Evidence must be attributable to the release commit and
environment.

## Release decision

The release remains NOT CERTIFIED until every mandatory criterion is VERIFIED and the
technical/business owners have approved the cutover. A source-level pass cannot override
this register. Production database writes, payment activation and DNS cutover remain
separate approval-controlled actions.
