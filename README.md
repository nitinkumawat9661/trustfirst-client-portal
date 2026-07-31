# TrustFirst Client Portal / Mangalam Sanitary ERP

Production-grade multi-tenant client portal and hardware ERP built with Next.js 16, TypeScript, PostgreSQL, Prisma ORM, Auth.js, Tailwind CSS and Zod.

The repository includes the TrustFirst platform foundation and the Mangalam Sanitary ERP workflows for product catalogue, inventory, purchases, sales, estimates, billing, printing, customers, suppliers, outstanding balances, financial transactions and reports.

## Engineering guide

Read [`docs/DEVELOPER_ARCHITECTURE_GUIDE.md`](docs/DEVELOPER_ARCHITECTURE_GUIDE.md) before changing billing, inventory, printing, authentication, financial or deployment code. It defines module boundaries, key files, transaction rules, testing requirements and the VPS-only release process.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- PostgreSQL and Prisma ORM
- Auth.js
- React Hook Form and Zod
- Vitest and Playwright
- Docker Compose
- npm workspaces monorepo
- PM2 and guarded VPS canary deployment

## Structure

```text
apps/
  web/                  Next.js application, server use cases and feature UI
packages/
  config/               Shared runtime configuration helpers
  database/             Prisma schema and database client
  ui/                   Shared UI primitives and theme utilities
docs/                   Architecture, operations and handover documentation
scripts/                Validation, staging, backup and VPS deployment scripts
e2e/                    Real Chromium end-to-end journeys
.github/workflows/       CI, staging E2E and VPS production gates
```

## Local setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Required validation

```bash
npm ci
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
npm run db:generate
npm run architecture:check
npm run lint
npm run typecheck
npm test
npm run build --workspace @trustfirst/web
```

## Architecture rule

Changes must follow this dependency direction:

```text
route → UI → feature adapter → server use case → domain validation → Prisma transaction
```

UI components must not access Prisma directly. Server modules must not import React components. Pure feature-core modules must remain independent from browser, React, Next.js and database APIs.

## Production deployment

Mangalam production is deployed only through the guarded VPS workflow:

- production port `3010`,
- canary port `3012`,
- exact deployed SHA verification,
- rollback protection,
- CafeLuxe port `3000` isolation,
- explicit migration and seed/data-mutation reporting.

Vercel is not the Mangalam production runtime and must not be treated as production deployment evidence.
