# G-08 — Live security certification UAT runbook

**Scope:** RLS, RPC execute privileges and private Storage role isolation.  
**Safety:** Staging-only, read-only SQL, no fixture creation or deletion.  
**Target:** A dedicated Supabase staging project whose ref is different from the canonical project in `supabase/config.toml`.

## 1. Preconditions

1. Provision a separate disposable/staging Supabase project with the same migration baseline as the candidate release. Do not use production.
2. Apply reviewed migrations to staging through the separately approved release process. This test runner never pushes migrations.
3. Create two disposable Auth users, Customer A and Customer B, and associate them with their own customer records.
4. Create one disposable order owned by Customer B and one private object in the `private-documents` bucket owned by Customer B. Record the order UUID and exact object path. Do not use real customer data.
5. Ensure Customer B can read its own fixtures in the normal application before the test. The SQL positive control requires exactly one visible order and object.
6. Install PostgreSQL client `psql` and link the repository to the staging project. Never link the production project for this test.
7. Obtain a staging database connection string from Supabase. Supply it through an environment variable; never put it in a command-line transcript, report or source file.

## 2. Windows CMD execution

From `TOPLINE-FLOORING-main`:

```cmd
set TOPLINE_SECURITY_UAT_ENV=staging
set TOPLINE_ALLOW_SECURITY_UAT=true
set TOPLINE_SECURITY_STAGING_PROJECT_REF=<20-character-staging-project-ref>
set TOPLINE_SECURITY_STAGING_DATABASE_URL=<staging-postgres-connection-string>
set TOPLINE_G08_CUSTOMER_A_AUTH_ID=<customer-a-auth-user-uuid>
set TOPLINE_G08_CUSTOMER_B_AUTH_ID=<customer-b-auth-user-uuid>
set TOPLINE_G08_CUSTOMER_B_CUSTOMER_ID=<customer-b-customer-record-uuid>
set TOPLINE_G08_CUSTOMER_B_ORDER_ID=<customer-b-test-order-uuid>
set TOPLINE_G08_CUSTOMER_B_PRIVATE_OBJECT_PATH=<exact-private-object-path>
npm run verify:g08-security-certification
npm run uat:g08-security
```

The private object path must be prefixed by Customer B’s customer-record UUID, matching the existing `customer_portal_access` Storage policy. The runner fails closed unless the target is explicitly marked staging, the opt-in is set, the linked project ref matches, the DB hostname matches the staging ref, and the target ref differs from the canonical project ref. It passes database credentials to `psql` through process environment variables, not command-line arguments. It executes `psql` with `ON_ERROR_STOP=1` and a read-only transaction. The SQL performs no inserts, updates, deletes, grants, policy changes or schema changes.

## 3. What the live test proves

- RLS is enabled on the named sensitive public tables and `storage.objects`.
- `private-documents` exists and is not public; Storage object policies exist.
- Communication worker RPCs are not executable by `anon` or `authenticated`.
- Anonymous users cannot see the private fixture object.
- Customer A cannot read Customer B's order or private object.
- Customer B can read exactly its own order and private object (positive controls; prevents false confidence from empty fixtures).

This is a targeted role-isolation test, not a full penetration test or exhaustive RPC authorization matrix. Existing `supabase/tests/browser_rpc_grants.sql`, `supabase/tests/security_regression.sql`, and the migration policy inventory remain complementary checks.

## 4. Evidence and closure

Retain `artifacts/g08-security-uat/g08-security-uat.log`, `g08-security-uat-summary.json`, and the rendered SQL. Redact connection strings and user identifiers before sharing evidence. G-08 remains OPEN until a successful run against the isolated staging project is reviewed, all positive and negative controls pass, and the staging project ref / migration SHA are recorded.

**Do not run this against production. Do not use service-role credentials for the customer-role tests. Do not modify grants or policies to make a failing test pass without a separately reviewed security fix.**
