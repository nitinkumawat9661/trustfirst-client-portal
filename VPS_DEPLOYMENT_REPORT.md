# VPS Deployment Report

## Status

TrustFirst Client Portal was deployed successfully to the authorized shared VPS as an isolated Manglam demo environment.

## Deployment Target

- VPS URL: `http://45.10.21.141:3010`
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

## Environment

- Env configured: yes
- Env file: `/etc/trustfirst-client-portal.env`
- Storage status: configured
- Upload directory: `/var/www/trustfirst-client-portal/storage/uploads`
- App path: `/var/www/trustfirst-client-portal`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- UFW: `3010/tcp` allowed for TrustFirst

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
- Auth route: 200
- Manifest: 200
- Offline page: 200
- Protected admin routes: redirected when unauthenticated
- Authenticated QA: passed with generated Manglam demo admin credentials without printing the password
- Authenticated pages checked: `/admin/hardware/demo/manglam`, `/admin/hardware/products`, `/admin/hardware/inventory`, `/admin/billing`, `/admin/release-checklist`
- CafeLuxe files untouched: yes
- CafeLuxe database untouched: yes
- CafeLuxe PM2 process untouched: yes
- CafeLuxe Nginx/Caddy config not overwritten: yes
- CafeLuxe port 3000 untouched: yes
- TrustFirst port: `3010`

## Demo Readiness

Final demo readiness: deployed and ready for staging QA on the shared VPS.

For a polished browser-based client demo, configure a real HTTPS domain or reverse proxy for TrustFirst. The app intentionally uses secure production cookies, so direct HTTP on an IP/port is acceptable for smoke checks but is not the preferred final login experience.

## Notes

- Deployment used a tracked-source archive over verified SSH because the GitHub remote currently exposes no `main` branch heads to clone from.
- Secrets were generated on the VPS and written only to `/etc/trustfirst-client-portal.env`.
- No `.env.deploy.local`, private SSH key, database password, `AUTH_SECRET`, or demo password was committed.
