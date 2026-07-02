# Preview Deployment Report

## Deployment

- Deployed source base commit: `f141a1bd275cb961d038f2714d0813b1f61dca9c`
- Report/fix commit: this Git commit (`chore: preview deployment readiness report`)
- Preview URL: `https://trustfirst-client-portal-gz8kl8z77-nitin-kumawat-s-projects.vercel.app`
- Vercel deployment ID: `dpl_hiw4VfD3ZuaQVZ41R1DEyDbt4uhS`
- Vercel target: `preview`
- Vercel status: `Ready`
- Inspect URL: `https://vercel.com/nitin-kumawat-s-projects/trustfirst-client-portal/hiw4VfD3ZuaQVZ41R1DEyDbt4uhS`

## Environment Status

- `vercel pull --environment=preview` completed and linked the project.
- Vercel preview environment variables are not configured for application runtime.
- `vercel env ls preview` returned no project environment variables.
- `npm run deploy:env` failed because `DATABASE_URL` and `AUTH_SECRET` are missing.
- Preview `DATABASE_URL` could not be confirmed as non-production because it is not configured.
- Sprint 23 attempted to provision Neon through Vercel Marketplace, but Vercel requires Marketplace terms acceptance for Neon before provisioning.
- Sprint 23 attempted to set `AUTH_SECRET`, `AUTH_URL`, and `NEXTAUTH_URL` through Vercel CLI and REST API. CLI preview env writes failed due branch/project state, and REST writes returned `403 forbidden`.

## Migration Status

- `npm run deploy:migration-check` failed before connecting because `DATABASE_URL` is missing.
- `npm run deploy:migration-check -- --apply` was not applied and failed safely because `DATABASE_URL` is missing.
- No production database migration was attempted.

## Seed Status

- `npm run seed:manglam-demo` was attempted.
- Seed script portability was fixed to resolve Prisma Client from the database workspace.
- Final seed status: blocked because `DATABASE_URL` is missing.
- Tenant slug `manglam-trading-demo` could not be verified in preview database because preview database is not configured.

## Automated Verification

| Check | Result |
| --- | --- |
| `npm run db:generate` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm test` | Passed, 20 files and 66 tests |
| Vercel preview deploy | Passed, deployment Ready |
| `SMOKE_BASE_URL=<preview-url> npm run deploy:smoke` | Passed |

## Smoke Test Notes

The preview deployment is protected by Vercel SSO. Smoke checks returned Vercel SSO redirects for all checked routes and are treated as route-availability signals only when the redirect target is Vercel SSO.

Checked routes:

- `/api/auth/session`
- `/manifest.webmanifest`
- `/offline`
- `/admin/hardware/demo`
- `/admin/billing`
- `/admin/hardware/inventory`
- `/admin/hardware/print/sample`

## Manual QA Checklist

| Route or flow | Status | Notes |
| --- | --- | --- |
| `/admin/release-checklist` | Blocked | Requires authenticated app runtime and preview DB/auth env. |
| `/admin/hardware/demo` | Smoke reachable behind Vercel SSO | Authenticated content not verified. |
| `/admin/hardware/demo/manglam` | Blocked | Requires authenticated app runtime and seeded tenant data. |
| `/admin/hardware/products` | Blocked | Requires authenticated app runtime and seeded tenant data. |
| `/admin/hardware/inventory` | Smoke reachable behind Vercel SSO | Stock data not verified. |
| `/admin/hardware/sales/new` | Blocked | Requires authenticated app runtime and seeded tenant data. |
| `/admin/billing` | Smoke reachable behind Vercel SSO | Billing data not verified. |
| `/offline` | Smoke reachable behind Vercel SSO | Public page is protected by Vercel deployment protection. |
| `/manifest.webmanifest` | Smoke reachable behind Vercel SSO | Public manifest is protected by Vercel deployment protection. |

## Manglam Demo Flow QA

| Acceptance item | Status | Notes |
| --- | --- | --- |
| Settings ready | Blocked | Seed and DB verification require preview `DATABASE_URL`. |
| Catalog ready | Blocked | Product seed could not run. |
| Opening stock ready | Blocked | Inventory seed could not run. |
| Quotation creation | Blocked | Requires authenticated seeded tenant. |
| Quotation to sale | Blocked | Requires authenticated seeded tenant. |
| Stock deduction | Blocked | Requires preview DB and seeded products. |
| Invoice draft | Blocked | Requires authenticated seeded tenant. |
| A4 print preview | Blocked | Requires a real hardware document ID from seed/demo flow. |
| Manual payment | Blocked | Requires authenticated seeded tenant and billing data. |
| Outstanding update | Blocked | Requires billing/payment flow execution. |
| Offline queue panel | Blocked | Requires authenticated app route access for module QA. |

## Deployment Fixes Applied

- Added `vercel.json` for monorepo Next.js deployment with explicit build output.
- Added Prisma generation to the Vercel build command.
- Added explicit Tailwind Linux native optional dependency for Vercel Linux builds.
- Added route-level summary typings for Vercel's stricter remote Next.js typecheck.
- Updated smoke tests to accept only Vercel SSO redirects for protected preview deployments.
- Fixed Manglam seed script Prisma Client resolution for the monorepo workspace.

## Known Limitations

- Preview database and auth secrets are not configured in Vercel.
- Preview migrations were not applied.
- Manglam demo seed was not executed against a preview database.
- Manual browser QA could not verify authenticated, tenant-aware business flows.
- Vercel deployment protection currently redirects public smoke routes.
- Payment gateways remain contract-only, as required.
- See `BLOCKER_REPORT.md` for Sprint 23 database and preview environment access blockers.

## Demo Readiness Decision

Not ready for client demo yet.

The application builds and deploys successfully to Vercel preview, and route availability smoke checks pass behind Vercel SSO. The Manglam demo cannot be accepted until preview `DATABASE_URL`, `AUTH_SECRET`, and app URL variables are configured, migrations are applied to the preview database, `npm run seed:manglam-demo` succeeds, and authenticated manual QA verifies the full hardware demo flow.
