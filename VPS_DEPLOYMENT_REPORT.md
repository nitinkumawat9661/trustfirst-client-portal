# VPS Deployment Report

## Status

- Final deployed SHA: `7ab09b435a42e04f2d2dd36a419b64103c6f869c`
- GitHub `main` SHA: `7ab09b435a42e04f2d2dd36a419b64103c6f869c`
- Release directory: `/var/www/trustfirst-client-portal-releases/7ab09b435a42e04f2d2dd36a419b64103c6f869c`
- Production PM2 process: `trustfirst-client-portal`
- Production port: `3010`
- Canary: passed on port `3012`, then stopped
- Final readiness: SOFTWARE READY FOR CLIENT HANDOVER AND DAILY BILLING; physical printer confirmation pending

## URLs

- Public URL: `https://mangalamsanitary.in`
- ERP URL: `https://app.mangalamsanitary.in`
- TrustFirst portal: `https://client.trustfirstsolutions.in`
- Removed unsupported domain assumptions: `manglam.in`, `app.manglam.in`

## Authentication And Cookies

- Mangalam ERP sign-in: `https://app.mangalamsanitary.in/signin`
- Anonymous ERP admin redirect: `/signin?callbackUrl=%2Fadmin`
- Mangalam callback cookie: `https://app.mangalamsanitary.in`
- TrustFirst callback cookie: `https://client.trustfirstsolutions.in`
- `AUTH_URL` and `NEXTAUTH_URL`: removed from the TrustFirst VPS env to allow host-derived Auth.js callbacks
- Temporary HTTP staging auth gates: absent
- Cookie flags observed: `HttpOnly`, `Secure`, `SameSite=Lax`

## Validation

- `npm run db:generate`: passed
- `npm run demo:env`: passed
- `npm run demo:db`: passed
- `npm run demo:manglam`: passed
- Demo migration safety with loaded demo env: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 36 files and 135 tests
- `npm run build`: passed
- `git diff --check`: passed
- Mangalam host smoke: passed
- TrustFirst host smoke: passed
- Runtime health: passed
- Product import template: HTTP 200 CSV
- Product import page: protected and redirects to Mangalam `/signin`
- PWA manifest on ERP host: `MANGALAM SANITARY ERP`

## Backup

- Backup path: `/var/backups/trustfirst-client-portal/20260727T083505Z`
- Database dump: `trustfirst_demo.dump`
- Database dump SHA-256: `a7c28f613a9962886a38a5b44ae00e0eb2a6755c183fb27c6e731d91a51df80c`
- Tenant assets backup: `tenant-assets.tgz`
- Protected env backup: handled by server-side backup process without printing secrets
- Previous backups preserved: yes

## VPS Runtime

- Host: `45.10.x.x`
- OS: Ubuntu 22.04.5 LTS
- Node: v22.23.0
- npm: 10.9.8
- PostgreSQL: 14.23
- Nginx: 1.18.0
- PM2: 7.0.1
- Database: `trustfirst_demo`
- Port 3010: loopback-only
- PM2 persistence: `pm2-trustfirst.service` active and enabled

## Security And Audit

- Host-key verification: passed
- Host-header/open redirect tests: added and passed
- Unsupported Mangalam domains removed from runtime routing and tests
- Product import CSV formula validation: implemented
- Product import duplicate/idempotency/transaction tests: passed
- GST HSN/tax snapshot regression: passed
- `npm audit --omit=dev`: 3 high advisories remain via Next transitive `postcss` and `sharp`; npm only suggests `npm audit fix --force`, which is breaking, so no forced dependency change was applied.

## CafeLuxe Isolation

- CafeLuxe files touched: no
- CafeLuxe database touched: no
- CafeLuxe PM2 process touched: no
- CafeLuxe Nginx config touched: no
- CafeLuxe port 3000 touched: no

## Remaining External Items

- Owner/admin browser login with real handover credential: pending secure credential handoff or known credential
- Physical printer output: pending client printer selection and paper confirmation
- GST provider/GSP credentials: pending
- E-invoice applicability: pending turnover verification
