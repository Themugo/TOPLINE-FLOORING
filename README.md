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
VITE_SUPABASE_ANON_KEY=<topline-anon-key>
```

Optional:

```text
VITE_SITE_URL=https://<topline-production-domain>
VITE_LOGGING_API_ENDPOINT=https://<approved-observability-endpoint>
```

No Supabase project, service-role key, password, or deployment credential belongs in this repository.

## Authentication

The business portal uses Supabase Auth email/password sessions. There are **no default usernames or passwords** in the application documentation.

Staff roles and granular permissions will be established in the dedicated infrastructure/RBAC phase. Authentication alone is not treated as a complete authorization model.

## Database status

The current `supabase/migrations/` directory contains historical development migrations and is not yet the canonical production migration chain. Do not blindly apply the whole directory to a new production database. The infrastructure phase will create a clean baseline and verified migration sequence.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the Phase-1 application boundary and data-access rules.

## Deployment

Production deployment requires the Topline Supabase project and verified database/RLS configuration before the authenticated business portal is enabled. See `DEPLOYMENT.md` for the current deployment notes and infrastructure prerequisites.

## License

All rights reserved. Topline Flooring & Waterproofing.
