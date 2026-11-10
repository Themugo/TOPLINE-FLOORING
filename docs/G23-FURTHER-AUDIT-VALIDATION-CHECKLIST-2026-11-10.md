# Further Audit Validation Checklist — 2026-11-10

## Source and release evidence
- [x] Reconcile G-23 migration count to the active source directory (168).
- [x] Make G-23 verifier derive the count dynamically.
- [x] Keep all 13 external release criteria pending until evidence exists.
- [x] G-19 HSE source and lifecycle verifiers pass.
- [x] G-20 privacy, G-20 workflow register, G-21 deployment and G-22 release readiness source gates pass.
- [x] Full static verification: 193/193.

## Still required
- [ ] Complete `npm ci` in a network-enabled environment using the committed lockfile.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm run build`, smoke tests and responsive browser tests.
- [ ] Replay all 168 migrations against a fresh disposable PostgreSQL/Supabase database.
- [ ] Review linked migration history, `db push --dry-run`, database lint and staging RLS/RPC tests.
- [ ] Execute real isolated database AND Storage backup restore; calculate evidence-backed RPO/RTO and obtain independent sign-off.
- [ ] Complete actual site HSE inspection, PPE/induction/emergency evidence, worker consultation and competent HSE sign-off.
- [ ] Complete remaining production CI, Auth, hosting, payments, communications, business UAT, DNS, rollback and approval evidence.

Do not mark an external item complete without dated, attributable evidence. Do not use production for destructive tests. No commit, push or deployment is authorised by this checklist.
