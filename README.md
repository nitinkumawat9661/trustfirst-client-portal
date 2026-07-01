# TrustFirst Client Portal

Production-grade SaaS foundation for a client portal built with Next.js 16, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, Auth.js, React Hook Form, and Zod.

This repository intentionally contains foundation only. Business modules should be added later inside the existing bounded-context structure.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma ORM
- Auth.js
- React Hook Form and Zod
- Docker Compose
- npm workspaces monorepo

## Structure

```txt
apps/
  web/                  Next.js application
packages/
  config/               Shared runtime configuration helpers
  database/             Prisma schema and database client
  ui/                   Shared UI primitives and theme utilities
docs/                   Architecture and operations documentation
```

## Getting Started

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Docker

Run the app and database:

```bash
cp .env.example .env
docker compose up --build
```

## Scope

Included:

- Workspace and enterprise folder structure
- Theme tokens and shared UI primitives
- Landing page
- Admin and client shells
- Auth.js foundation with Prisma adapter
- Prisma schema for authentication entities and roles
- Form validation foundation
- Docker and documentation

Not included yet:

- Client onboarding workflows
- Document management
- Billing
- Case/task modules
- Notification workflows
