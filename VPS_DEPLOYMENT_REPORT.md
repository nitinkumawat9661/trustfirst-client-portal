# VPS Deployment Report

## Sprint 41 Runtime Hardening

- Outage root cause: `trustfirst-client-portal` was absent from the `trustfirst` PM2 daemon, so port `3010` was not listening
- Restoration: started only `trustfirst-client-portal` and saved the TrustFirst PM2 process list
- PM2 saved list: `/home/trustfirst/.pm2/dump.pm2`
- PM2 persistence service: `pm2-trustfirst.service`
- Startup service enabled: yes
- Startup service active: yes
- PM2 auto-restart: enabled
- Controlled systemd restart and saved-process resurrection: passed
- Runtime health command: `npm run runtime:health`
- Final runtime health: passed
- Latest VPS smoke: passed
- Latest intake smoke: passed, `PUB-REQ-2026-0014`
- Public intake status: HTTP `200`
- Auth.js session status: HTTP `200`
- Route lockdown preserved: yes, anonymous admin request returned `307`
- CafeLuxe untouched: yes

## Status

TrustFirst Client Portal is deployed to the authorized shared VPS as an isolated Manglam demo environment.

Sprint 39C verified that the public intake API was saving submissions, but the live thank-you page was still rendering the older built page. The VPS source contained Sprint 39, while the active runtime build did not show the receipt fields. The hardened deploy script rebuilt and restarted only `trustfirst-client-portal`, and live intake smoke now passes.

Sprint 35 HTTPS domain setup remains blocked because `DEPLOY_DOMAIN` is empty in `.env.deploy.local`.

## Deployment Target

- VPS URL: `http://45.10.21.141:3010`
- Public intake URL: `http://45.10.21.141:3010/intake/manglam-trading-demo`
- Protected intake queue: `/admin/requirements/intake`
- Final HTTPS demo URL: blocked, no domain configured
- Host: `45.10.x.x`
- Shared old VPS used: yes
- Deploy user: `trustfirst`
- Host-key status: verified by trusted ED25519 fingerprint
- SSH access status: passed after intermittent port 22 reachability recovered
- Deployed commit hash: `a84cfd0e30b39d63d0e9f3f02c63dacc17f280ec`
- Server OS: Ubuntu 22.04.5 LTS
- Node version: v22.23.0
- npm version: 10.9.8
- PostgreSQL version: 14.23
- Git version: 2.34.1
- Reverse proxy: not changed; no TrustFirst domain configured

## Environment

- Env configured: yes
- Env file: `/etc/trustfirst-client-portal.env`
- Storage status: configured
- Upload directory: `/var/www/trustfirst-client-portal/storage/uploads`
- App path: `/var/www/trustfirst-client-portal`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- AUTH_URL status: `http://45.10.21.141:3010`
- HTTP staging login enabled: yes
- HTTP staging auth bypass enabled: yes, internal QA header required
- Validation secret redaction: yes, `npm run vps:validate` reports key presence only
- Secret rotation note created: yes, see `STAGING_SECRET_ROTATION_NOTE.md`

## Database

- PostgreSQL setup: completed
- Database: `trustfirst_demo`
- User: `trustfirst_demo`
- Migration status: all 9 migrations applied; no pending migrations
- Seed status: `seed:manglam-demo` completed
- Tenant slug: `manglam-trading-demo`
- Public intake DB verification: passed
- Latest public intake smoke submission: `PUB-REQ-2026-0014`

## QA

- External smoke after warm-up: passed against `http://45.10.21.141:3010`
- `npm run vps:smoke`: passed
- `SMOKE_BASE_URL=http://45.10.21.141:3010 npm run deploy:smoke`: passed
- `SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke`: passed
- Public intake page: 200
- Public intake loading marker present: no
- Public form visible markers: passed
- Public intake JSON submit: passed, `PUB-REQ-2026-0014`
- Thank-you page shows Submission ID: yes
- Thank-you page shows submitted business name: yes
- Thank-you appears only after saved DB receipt lookup: yes
- Admin intake queue verifies same Submission ID: yes
- Public cannot list/read submissions: yes
- Protected admin routes without login: 307 redirect
- Protected client routes without login: 307 redirect
- Protected master/API routes without login: 307 redirect
- HTTPS smoke: not run, blocked by missing domain
- CafeLuxe files untouched: yes
- CafeLuxe database untouched: yes
- CafeLuxe PM2 process untouched: yes
- CafeLuxe Nginx/Caddy config not overwritten: yes
- CafeLuxe port 3000 untouched: yes
- TrustFirst port: `3010`

## Demo Readiness

Final readiness: READY FOR PUBLIC HTTP STAGING INTAKE QA ONLY.

The public intake link is safe for HTTP staging QA. A polished production-style client demo still requires a real HTTPS domain, staging secret rotation, and removal of temporary HTTP staging env gates.

## Notes

- Root cause: the live runtime still served the older built thank-you page even though the VPS source tree contained Sprint 39 receipt-loading code.
- Fix: hardened VPS deploy output, tracked deployed commit stamp, rebuilt app, restarted only `trustfirst-client-portal`, and reran live smoke.
- `npm ci` on the VPS reported three moderate npm audit findings. They were not changed in Sprint 39C because remediation may require dependency upgrades outside this focused deployment/intake scope.
- `npm run vps:validate` no longer prints PM2 env values.
- Initial deploy external smoke failed immediately after restart, then local loopback smoke passed. Follow-up external `vps:smoke` and `deploy:smoke` passed after warm-up.
