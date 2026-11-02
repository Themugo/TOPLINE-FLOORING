# TOPLINE FLOORING & ROOFING — Client Handover Guide

**Document status:** Draft for technical handover; operational acceptance remains blocked.

## System overview

The supplied source describes a single-business system with a public website and an authenticated business portal. The frontend uses React 18, TypeScript, Vite, Tailwind CSS, TanStack Query and Wouter. Supabase/PostgreSQL and Supabase Auth are the intended persistence, identity and authorisation boundary. Vercel hosts the frontend. Existing integrations include Brevo communications and payment-provider workflows.

## Local development

Requirements documented by the repository:
- Node.js 20 LTS baseline; Node 20–26 supported.
- npm 10 or later.

From the project root:

```bash
npm ci
npm run dev
```

Validation commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:all
npm run test:release-safety-guards
```

The `npm ci` command could not complete in the assessment environment because registry fetches returned `EAI_AGAIN`. Re-run it from a network with working npm registry access before relying on dependency-backed commands.

## Environment setup

Copy `.env.example` to `.env.local` and provide the client-approved public Supabase URL and publishable/anon key. Set the canonical site URL. Do not put service-role keys, provider secrets, webhook secrets or SMTP credentials in browser-exposed variables.

The repository's current `.env.example` pins a Topline Supabase URL. Confirm project ownership and target identity with the client before using it. Do not assume the project is staging or production solely from the URL.

## Database operations

The repository contains 127 SQL migration files. The project documentation warns against blindly applying historical migrations. Review the canonical migration policy and verify the target project before deployment.

The local database validation command is destructive to the local Supabase database and now requires:

```bash
TOPLINE_ALLOW_LOCAL_DB_RESET=true npm run validate:local-db
```

Only use this on an explicitly disposable local Supabase instance. Never use `db reset` against a linked production project.

## Administration

The source describes authenticated staff/admin operations, catalogue management, customer/order tracking, quotations, invoicing, inventory, projects, procurement, field operations, communications and reporting. Exact menu access depends on the deployed role and permission configuration. Do not share default credentials: the project documentation states there are no default administrator passwords.

## Integrations

- Supabase: database, authentication, RLS, storage and Edge Functions.
- Vercel: frontend hosting and SPA routing.
- Brevo: email delivery and marketing synchronisation where configured.
- Payment/M-Pesa: provider initiation and webhook handling, subject to sandbox certification and production activation.

All integration credentials must be provisioned and owned by the client in the appropriate provider consoles or secret stores.

## Handover limitations

This document is not a production runbook sign-off. The actual deployed environment, owner/admin identity, provider credentials, scheduled jobs, backup policy, recovery process, and support contacts still require client confirmation and operational acceptance. No passwords or secrets are included.
