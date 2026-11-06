# Topline Customer Self-Service Experience 360

## Scope
Strengthen the authenticated customer portal with customer-bound notification preferences and a secure document metadata center, while preserving the existing portal identity boundary.

## Implemented
- Migration 100 adds customer-bound preference retrieval and mutation RPCs.
- Customer notification preferences can be changed without accepting a customer ID from the browser.
- Customer document metadata is exposed only through an authenticated identity-bound RPC.
- Legacy `file_url` values are intentionally excluded from the document metadata RPC.
- Portal now loads customer data, journey, preferences and document metadata together.
- Portal UI adds Documents and Notification Preferences sections.
- Operational notification controls remain distinct from optional marketing preferences.
- Static security verifier added.

## Verification
- Customer Self-Service Experience 360 static verification PASSED.
- JavaScript syntax verification PASSED.
- package.json validation PASSED.
- Local typecheck could not be rerun in the temporary build workspace because its `node_modules/typescript` installation is incomplete. The user's current local repository had already been confirmed clean before this initiative.

## Deployment
Migration 100 must be deployed to the client-owned Supabase project after the existing CLI privilege/password issue is resolved. Do not put secrets in the repository.
