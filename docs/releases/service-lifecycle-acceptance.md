# Product and Service Lifecycle Acceptance

**Assessment date:** 2026-11-02  
**Status:** BLOCKED — static contracts available; authenticated staging lifecycle not executed.

## Source-level findings

The service E2E script exercises public service reads, optional public image retrieval, and an explicitly enabled mutation path for authenticated service creation, image upload/read-back, installation creation, staff assignment, status transitions and cleanup.

The supplied archive includes the service slug migration and source contracts. The aggregate static verification suite passed before the additional safety changes.

## Safety correction

The E2E script no longer accepts a production override. Mutation mode is permanently blocked for the canonical Topline Supabase project. Isolated mutation mode requires:
- `E2E_RUN_MUTATIONS=true`
- `E2E_EXPECTED_SUPABASE_URL` exactly matching the target URL
- HTTPS for remote staging or loopback for local testing
- test administrator credentials

Do not use production credentials or customer data for acceptance.

## Acceptance still required

- Confirm staging database has `services.slug` and current PostgREST schema cache.
- Create, update, read back and delete a temporary service.
- Upload, retrieve and clean up a temporary image.
- Exercise installation creation, staff assignment, status changes and cleanup.
- Confirm public service detail and quotation/enquiry journeys.
- Repeat equivalent product upload and catalogue regression tests.

No staging records or storage objects were created during this cycle.
