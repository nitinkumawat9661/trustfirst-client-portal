# VPS Deployment Report

## Status

TrustFirst Client Portal is deployed successfully to the authorized shared VPS as an isolated Manglam demo environment.

Sprint 35 HTTPS domain setup is blocked because `DEPLOY_DOMAIN` is empty in `.env.deploy.local`. The app remains available for staging QA at the direct HTTP port URL, with temporary HTTP staging login enabled by an explicit env gate.

## Deployment Target

- VPS URL: `http://45.10.21.141:3010`
- Final HTTPS demo URL: blocked, no domain configured
- Host: `45.10.x.x`
- Shared old VPS used: yes
- Deploy user: `trustfirst`
- Host-key status: verified by trusted ED25519 fingerprint
- SSH access status: passed
- Server OS: Ubuntu 22.04.5 LTS
- Node version: v22.23.0
- npm version: 10.9.8
- PostgreSQL version: 14.23
- Git version: 2.34.1
- Reverse proxy: not changed; no TrustFirst domain configured
- Domain/subdomain: not configured
- Required DNS record: `demo.trustfirstsolutions.in A 45.10.21.141`

## Environment

- Env configured: yes
- Env file: `/etc/trustfirst-client-portal.env`
- Storage status: configured
- Upload directory: `/var/www/trustfirst-client-portal/storage/uploads`
- App path: `/var/www/trustfirst-client-portal`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- UFW: `3010/tcp` allowed for TrustFirst
- AUTH_URL updated to HTTPS domain: no
- AUTH_URL status: `http://45.10.21.141:3010`
- HTTP staging login enabled: yes
- PM2 restarted for HTTPS domain: no

## Database

- PostgreSQL setup: completed
- Database: `trustfirst_demo`
- User: `trustfirst_demo`
- Migration status: all 9 migrations applied successfully
- Seed status: `seed:manglam-demo` completed
- Tenant slug: `manglam-trading-demo`
- Seed verification: 8 products, 2 stock locations, 6 clients, 3 hardware trade documents, 0 invoices

## QA

- External smoke: passed against `http://45.10.21.141:3010`
- HTTPS smoke: not run, blocked by missing domain
- Auth route: 200
- Manifest: 200
- Offline page: 200
- Protected admin routes: redirected when unauthenticated
- Authenticated QA: passed on current HTTP staging environment with generated Manglam demo admin credentials without printing the password
- Authenticated QA over HTTPS: not run, blocked by missing domain
- Manglam full demo QA over HTTP staging: passed
- Manglam flow checked: settings, catalog, opening stock, quotation, quotation-to-sale, stock deduction, invoice draft, A4 print preview, manual payment, outstanding dashboard, offline page
- Authenticated pages checked: `/admin/hardware/demo/manglam`, `/admin/hardware/products`, `/admin/hardware/inventory`, `/admin/billing`, `/admin/release-checklist`
- CafeLuxe files untouched: yes
- CafeLuxe database untouched: yes
- CafeLuxe PM2 process untouched: yes
- CafeLuxe Nginx/Caddy config not overwritten: yes
- CafeLuxe port 3000 untouched: yes
- TrustFirst port: `3010`

## Demo Readiness

Final demo readiness: READY FOR HTTP STAGING QA ONLY.

For a polished browser-based client demo, configure a real HTTPS domain or reverse proxy for TrustFirst. The app intentionally uses secure production cookies, so direct HTTP on an IP/port is acceptable for smoke checks but is not the preferred final login experience.

## Notes

- Deployment used a tracked-source archive over verified SSH because the GitHub remote currently exposes no `main` branch heads to clone from.
- Secrets were generated on the VPS and written only to `/etc/trustfirst-client-portal.env`.
- No `.env.deploy.local`, private SSH key, database password, `AUTH_SECRET`, or demo password was committed.
- Domain blocker details are documented in `DOMAIN_BLOCKER_REPORT.md`.
- Temporary HTTP login rollback is documented in `HTTP_STAGING_LOGIN_NOTE.md`.
