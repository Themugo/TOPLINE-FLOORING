# Phase 7 — Customer Documents and Self-Service Report

**Date:** 2026-11-06  
**Foundation:** Phase 6 repaired `TOPLINE-FLOORING-main` tree  
**Status:** Source repair complete; dependency, storage-link, staging and production gates remain outstanding.

## Audit finding

The customer portal loaded document metadata through `get_customer_portal_documents()` but provided no customer action to open or download a document. The existing RPC correctly excluded `file_url`, and the private Storage bucket already separated customer paths from project paths. The missing piece was a secure, authenticated download boundary between those two protections.

## Repair

Added `supabase/functions/customer-document-download/index.ts` and registered it with `verify_jwt = true` in `supabase/config.toml`.

The function:

- authenticates the Supabase user;
- resolves the active `customer_portal_access` row from the Auth identity;
- fetches the requested document only when its `customer_id` matches that mapping;
- accepts a legacy `file_url` only when it is already an object path under `<customer_id>/` in `private-documents`;
- rejects arbitrary URLs, traversal markers, cross-customer paths and unlinked legacy records;
- returns only metadata plus a five-minute signed URL generated server-side with the service role.

The portal now has an **Open document** action and explains the five-minute expiry. Raw file locations remain absent from the metadata RPC and are not returned by the Edge Function.

Added migration `supabase/migrations/20261106180000_audit7_customer_documents_self_service.sql` to record the deploy-order contract and preserve the existing customer metadata RPC boundary. Migration manifest and workflow registers were updated to 154 migrations and Phase 7.

## Validation

- Phase 7 customer documents/self-service static verification: **PASS**
- Existing Customer Self-Service Experience 360 verifier: **PASS**
- Customer self-service RPC/trust-boundary verifier: **14/14 PASS**
- Project document vault verifier: **PASS**
- Migration integrity verifier: **PASS**
- SQL runtime safety verifier: **PASS**
- Phase 3 cart/quotation/checkout regression: **16/16 PASS**
- Workflow register JSON parse: **PASS**
- TypeScript typecheck: **NOT RUN — extracted ZIP has no installed `node_modules/typescript`**

## Required staging / production gates

- Install locked dependencies and run typecheck, build and the full regression suite.
- Apply/replay all 154 migrations on a disposable staging database and verify the Edge Function deployment/configuration.
- Seed a staging customer document whose `file_url` is a `private-documents` customer object path; verify same-customer download, cross-customer denial, inactive portal denial, expired-link behaviour and legacy/unlinked-record handling.
- Perform authenticated browser checks on desktop and mobile widths, including link expiry and portal refresh/session recovery.
- Confirm Storage bucket policy behaviour and provider/runtime logs in staging before any production release.
- No production database, storage object, deployment, commit or push was performed.
