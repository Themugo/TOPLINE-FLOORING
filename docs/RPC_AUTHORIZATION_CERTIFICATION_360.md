# TOPLINE — RPC Authorization Certification 360

## Scope
Function-by-function authorization certification layered on migrations 089–094. This initiative covers:

- role → resource → action authorization
- customer ownership and parent-record consistency
- state-transition guardrails
- privilege-elevation / four-eyes controls
- cross-customer IDOR/RLS smoke testing
- deliberate RPC exposure
- private document storage boundary

## Implemented

### Migration 095
- Added machine-readable `public.rpc_authorization_certifications` inventory. Client RLS is deny-all.
- Classified the exposed SECURITY DEFINER RPC surface into PUBLIC, CUSTOMER, STAFF, ADMIN_PRIVILEGED and INTERNAL.
- Disabled the legacy authenticated `create_customer_order` RPC.
- Removed ordinary authenticated access to communication delivery worker state-changing RPCs.
- Added customer ownership assertions for project/order references used by customer service-case creation.
- Removed email-based customer portal fallback; portal data is bound to authenticated portal mapping.
- Added active-staff validation for project issue/task assignees.
- Added owner-only privileged access approval and requester≠approver four-eyes control.
- Added owner-only grants for elevated staff roles (`owner`, `admin`, `manager`) and prevented self-elevation.

### Migration 096
- Repaired the RLS execution boundary after least-privilege function revocation.
- `authenticated` may execute only the boolean `private.current_user_has_permission` helper required by RLS policies.
- `anon` and `PUBLIC` remain denied.

### Migration 097
- Added a private `private-documents` storage bucket.
- 10 MiB maximum object size.
- Explicit MIME allow-list.
- Customer access is bound to `customer_id/<path>` and the authenticated `customer_portal_access` mapping.
- Staff access is permission-gated through the media resource.
- Existing public `images` remains intentionally public for website/catalog media.

## Adversarial verification performed

### Direct unauthenticated database access
`anon` cannot directly read `public.customers`; the database returned `permission denied for table customers`.

### Authenticated no-identity boundary
With `authenticated` role and no valid customer identity, direct access to customers/orders/invoices/projects/service cases/communications/staff is isolated by RLS. The verified smoke result returned zero visible business rows.

### Fake authenticated identity
A synthetic authenticated UUID was injected only inside a rolled-back database transaction. Customer-bound data remained inaccessible; no cross-customer rows were exposed.

### RPC exposure
Live privilege verification after 095:

| RPC | anon | authenticated |
|---|---:|---:|
| legacy `create_customer_order` | DENIED | DENIED |
| `claim_communication_outbox` | DENIED | DENIED |
| `complete_communication_delivery` | DENIED | DENIED |
| `fail_communication_delivery` | DENIED | DENIED |
| `record_sms_delivery_report` | DENIED | DENIED |
| `create_secure_customer_order` | ALLOWED | ALLOWED |

The four remaining anonymous SECURITY DEFINER warnings are intentional public website boundaries: secure checkout, quotation submission, coupon validation and public order tracking.

## Live inventory

`rpc_authorization_certifications`: **195** SECURITY DEFINER public functions classified:

- PUBLIC: 4
- CUSTOMER: 6
- STAFF: 164
- ADMIN_PRIVILEGED: 6
- INTERNAL: 15
- BLOCKED legacy/worker exposure: 5

Supabase's security advisor currently reports 4 anonymous SECURITY DEFINER warnings and 174 authenticated SECURITY DEFINER warnings. The latter remain deliberately exposed only where the application architecture expects authenticated staff/customer RPC access; this initiative does not use blanket revocation because that would break legitimate workflows.

## Storage boundary

- `images`: public — website/catalog media only.
- `private-documents`: private — customer/project documents and exports.
- Existing application code continues to use `images`; confidential documents must be migrated to `private-documents` before production use.

## Remaining certification work

The live database is newly provisioned and currently has no customer/order/project/invoice records, so a true two-customer IDOR exercise cannot be performed against populated production data without manufacturing business records. The package therefore includes a non-destructive adversarial RLS smoke test and a certification inventory. Before launch with real data, run a controlled two-customer test fixture covering:

1. Customer A reading Customer B's customer/order/project/invoice/case rows.
2. Customer A invoking customer RPCs with Customer B IDs.
3. Customer A using Customer B's private storage path.
4. Staff role matrix: sales vs finance vs warehouse vs operations vs owner.
5. Privilege-request requester/approver separation.
6. State transitions from invalid prior states.
7. Object-level signed URL access for private documents.

No production business data was created by this initiative.
