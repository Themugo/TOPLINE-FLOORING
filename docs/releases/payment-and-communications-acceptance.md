# Payment and Communications Acceptance

**Assessment date:** 2026-11-02  
**Status:** BLOCKED — provider and delivery UAT prerequisites were not available.

## Payment UAT safety

Payment webhook UAT now requires:
- `PAYMENT_UAT_ENV` set to `sandbox`, `staging` or `local`.
- `PAYMENT_UAT_EXPECTED_HOST` exactly matching the configured endpoint host.
- HTTPS for remote endpoints; loopback only for local endpoints.
- `PAYMENT_UAT_ALLOW_MUTATION=true`.
- An isolated test order, webhook secret and provider configuration.

Known Topline production website and Supabase hosts are rejected unconditionally.

## M-Pesa UAT safety

M-Pesa initiation UAT now requires:
- An isolated initiation endpoint, test order, test email and test phone.
- `MPESA_UAT_ENV` set to `sandbox`, `staging` or `local`.
- `MPESA_UAT_EXPECTED_HOST` exactly matching the endpoint host.
- HTTPS for remote endpoints; loopback only for local endpoints.
- `MPESA_UAT_ALLOW_MUTATION=true`.

Missing prerequisites now return exit code 2 and a BLOCKED message. They are not reported as successful pending checks.

## Communications

The source contains the existing communications worker, Brevo integration and verification scripts. Static verification does not establish provider delivery. A controlled delivery test still requires approved test recipients and authorised provider configuration.

No payment, refund, M-Pesa initiation, webhook UAT request, bulk email or customer notification was sent during this cycle.
