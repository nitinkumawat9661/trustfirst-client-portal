# Architecture

TrustFirst Client Portal is organized as a monorepo with a single deployable web app and shared internal packages.

## Principles

- Keep route handlers and pages thin.
- Keep infrastructure access behind package boundaries.
- Prefer Server Components for data access and layout.
- Push client interactivity to small client components.
- Validate all external input with Zod.
- Re-check authorization in server code, not only in routing guards.

## Layers

```txt
apps/web
  app/                  Routes, layouts, route handlers
  components/           App-specific composition components
  features/             Feature foundations and future bounded contexts
  lib/                  App-level adapters

packages/database
  prisma/               Schema and migrations
  src/                  Lazy Prisma client

packages/ui
  src/components        Reusable primitives
  src/lib               Styling utilities

packages/config
  src                   Shared environment schema
```

## Future Module Placement

Business modules should be created under `apps/web/src/features/<module>` with `components`, `schemas`, `server`, and `types` folders as needed. Shared domain-neutral pieces can graduate into `packages/*` once a second consumer exists.
