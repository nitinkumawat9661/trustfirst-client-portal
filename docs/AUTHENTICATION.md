# Authentication

Auth.js is wired through `apps/web/src/auth.ts` and exposed through the route handler at `apps/web/src/app/api/auth/[...nextauth]/route.ts`.

## Included

- Prisma adapter
- Credentials provider scaffold
- Zod validation for sign-in input
- Session role enrichment
- Admin and client route shells

The credentials provider validates the request shape but does not authenticate passwords yet. Wire this to the selected provisioning policy before enabling production sign-ins.

## Required Environment

```txt
DATABASE_URL
AUTH_SECRET
AUTH_URL
```

Generate a strong `AUTH_SECRET` before deploying.
