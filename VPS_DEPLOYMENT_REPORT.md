# VPS Deployment Report

## Status

TrustFirst Client Portal is deployed successfully to the authorized shared VPS as an isolated Manglam demo environment.

Sprint 37 added a public write-only Manglam requirement intake and restored public lockdown for admin/client routes. Sprint 35 HTTPS domain setup remains blocked because `DEPLOY_DOMAIN` is empty in `.env.deploy.local`.

## Deployment Target

- VPS URL: `http://45.10.21.141:3010`
- Public intake URL: `http://45.10.21.141:3010/intake/manglam-trading-demo`
- Protected intake queue: `/admin/requirements/intake`
- Final HTTPS demo URL: blocked, no domain configured
- Host: `45.10.x.x`
- Shared old VPS used: yes
- Deploy user: `trustfirst`
- Host-key status: verified by trusted ED25519 fingerprint
- SSH access status: passed after one transient timeout retry
- Server OS: Ubuntu 22.04.5 LTS
- Node version: v22.23.0
- npm version: 10.9.8
- PostgreSQL version: 14.23
- Git version: 2.34.1
- Reverse proxy: not changed; no TrustFirst domain configured
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
- AUTH_URL status: `http://45.10.21.141:3010`
- HTTP staging login enabled: yes
- HTTP staging auth bypass enabled: yes, internal QA header required
- Sign-in removed for ordinary HTTP staging traffic: no
- PM2 restarted by deploy: yes

## Database

- PostgreSQL setup: completed
- Database: `trustfirst_demo`
- User: `trustfirst_demo`
- Migration status: all 9 migrations applied; no pending migrations
- Seed status: `seed:manglam-demo` completed
- Tenant slug: `manglam-trading-demo`
- Public intake DB verification: passed
- Latest public intake submission: `PUB-REQ-2026-0001`

## QA

- External smoke: passed against `http://45.10.21.141:3010`
- HTTPS smoke: not run, blocked by missing domain
- Auth route: 200
- Manifest: 200
- Offline page: 200
- Public intake page: 200
- Public intake API submit: passed
- Thank-you page: 200
- Public intake stored as Requirement: passed, status `PENDING`, priority `HIGH`
- Protected admin routes without login: 307 redirect
- Protected client routes without login: 307 redirect
- Protected requirements API without login: 307 redirect
- Admin intake queue with internal QA header: 200 and shows `PUB-REQ-2026-0001`
- Authenticated QA over HTTPS: not run, blocked by missing domain
- CafeLuxe files untouched: yes
- CafeLuxe database untouched: yes
- CafeLuxe PM2 process untouched: yes
- CafeLuxe Nginx/Caddy config not overwritten: yes
- CafeLuxe port 3000 untouched: yes
- TrustFirst port: `3010`

## Demo Readiness

Final readiness: READY FOR PUBLIC HTTP STAGING INTAKE QA ONLY.

The public intake link is usable on HTTP staging. A polished production-style client demo still requires a real HTTPS domain and removal of the temporary HTTP staging env gates.

## Notes

- Deployment used the committed local archive for `feat: add public manglam requirement intake`.
- No `.env.deploy.local`, private SSH key, database password, `AUTH_SECRET`, or demo password was committed.
- `npm ci` on the VPS reported three moderate npm audit findings. They were not changed in Sprint 37 because remediation may require dependency upgrades outside the public intake scope.
- `npm run vps:validate` currently prints PM2 environment details and should be redacted in a future deployment tooling hardening pass.
