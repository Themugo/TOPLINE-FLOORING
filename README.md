# Topline Flooring & Waterproofing

A dedicated business website and operations portal for Topline Flooring & Waterproofing in Kenya.

## Product scope

This is a **single-client business system**, not a SaaS/multi-tenant product. It combines:

- Public marketing website and service catalogue
- Product catalogue and shopping flow
- Quote and enquiry capture
- Customer/order tracking
- Authenticated business/admin portal
- Product, inventory, project, CRM, quotation, invoicing and content-management capabilities

## Technology

- React 18 + TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Wouter
- Radix UI primitives
- Supabase PostgreSQL + Auth (planned production infrastructure)

## Local development

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Validate

```bash
npm run typecheck
npm run lint
npm run build
```

### Preview

```bash
npm run preview
```

For sitemap generation, also set `VITE_SITE_URL` to the real Topline production domain and run `npm run build:all`.

## Environment

Copy `.env.example` to `.env` and provide the credentials for the **Topline Supabase project** when database-backed features are enabled:

```text
VITE_SUPABASE_URL=https://<topline-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<topline-project-key>
# Legacy anon keys remain supported for compatibility: VITE_SUPABASE_ANON_KEY=<topline-anon-key>
```

Optional:

```text
VITE_SITE_URL=https://<topline-production-domain>
VITE_LOGGING_API_ENDPOINT=https://<approved-observability-endpoint>
```

No Supabase project, service-role key, password, or deployment credential belongs in this repository.

## Authentication

The business portal uses Supabase Auth email/password sessions. There are **no default usernames or passwords** in the application documentation.

Staff membership, roles, granular permissions and database-enforced RLS are established by the Phase-3 infrastructure foundation. Authentication alone is not treated as a complete authorization model.

## Database status

The historical migration files are frozen prototype history. Phase 3 establishes a canonical forward migration policy and the staff/RBAC security foundation. Because no dedicated Topline remote project has been linked yet, the repository does not pretend to have reconciled an unknown remote migration history. A formal baseline squash is only safe after the dedicated project is inspected.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the Phase-1 application boundary and data-access rules.

## Deployment

Production deployment requires the Topline Supabase project and verified database/RLS configuration before the authenticated business portal is enabled. See `DEPLOYMENT.md` for the current deployment notes and infrastructure prerequisites.

## License

All rights reserved. Topline Flooring & Waterproofing.

### Engineering track
The current application also includes the Phase 45–47 field workforce, project cost ledger, and warranty/after-sales service foundation documented in `docs/PHASES_45_47_FIELD_COSTS_AFTER_SALES.md`.
