# Production environment root

This Next.js application runs from `apps/web` inside the repository workspace.

Guarded Mangalam production deployments must therefore materialize runtime-only Next/Auth.js settings at:

```text
apps/web/.env.production.local
```

Writing that file at the monorepo root is insufficient because the Next.js process resolves environment files from the application root.

The generated file is release-local, mode `0600`, and contains only canonical non-secret Auth.js URL/trusted-host settings. Database credentials and `AUTH_SECRET` remain in the protected VPS environment file and must never be committed.

Production deployment continues to require canary health, rollback protection, exact commit verification, canonical domain checks, and CafeLuxe port `3000` isolation.
