# Local migration chain check (optional, not part of verify:all)

Applies every migration in order to a scratch PostgreSQL 15/16 database, using a minimal
shim for Supabase-only objects (roles, `auth`, `storage`). Catches ordering and syntax errors
that static checks cannot.

```bash
createdb topline_check
psql -d topline_check -v ON_ERROR_STOP=1 -f scripts/local-db/supabase-shim.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  psql -d topline_check -q -v ON_ERROR_STOP=1 -1 -f "$f" || { echo "FAILED: $f"; break; }
done
```
Expected: no output (all migrations apply). Last verified: 97/97 migrations apply from an empty database.
This does NOT replace validation against the real Supabase project.

## Optional behaviour tests
`test-fixtures.sql` seeds an admin (`...a1`), a sales user (`...b2`), plus sample rows. With the shim and all
migrations applied, run SQL as a given user by prefixing `SET ROLE authenticated; SET request.jwt.claim.sub='<uuid>';`
(or `SET ROLE anon;`) to check what each role can read or write. Verified in the 2026-10-01 audit: anon/customer/staff
read boundaries, checkout RPC (price tampering ignored, idempotent replay, stock and quantity validation), payment recording
by role, storage policies for project documents, and customer-to-customer isolation.
