# VPS Deployment Report

## Status

TrustFirst Client Portal is deployed to the authorized shared VPS as an isolated Manglam demo environment. Sprint 39 code is committed locally but was not deployed because SSH access timed out during the verified deploy archive upload.

Sprint 38 fixed the public intake browser loading issue. The public intake page now renders a native server-side form directly instead of relying on a global loading fallback and client-side streaming reveal scripts.

Sprint 39 hardens submission confirmation so the thank-you page is rendered only from a saved database receipt. Local validation passed, but VPS deployment is blocked until port 22/SSH is reachable again from this workstation.

Sprint 35 HTTPS domain setup remains blocked because `DEPLOY_DOMAIN` is empty in `.env.deploy.local`.

## Deployment Target

- VPS URL: `http://45.10.21.141:3010`
- Public intake URL: `http://45.10.21.141:3010/intake/manglam-trading-demo`
- Protected intake queue: `/admin/requirements/intake`
- Final HTTPS demo URL: blocked, no domain configured
- Host: `45.10.x.x`
- Shared old VPS used: yes
- Deploy user: `trustfirst`
- Host-key status: trusted fingerprint is configured; latest `ssh-keyscan` retry could not collect a key because SSH timed out
- SSH access status: blocked during Sprint 39 retry, `ssh: connect to host 45.10.21.141 port 22: Connection timed out`
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
- AUTH_URL status: `http://45.10.21.141:3010`
- HTTP staging login enabled: yes
- HTTP staging auth bypass enabled: yes, internal QA header required
- Sign-in removed for ordinary HTTP staging traffic: no
- PM2 restarted by Sprint 39 deploy: no, deploy archive upload failed before remote changes

## Database

- PostgreSQL setup: completed
- Database: `trustfirst_demo`
- User: `trustfirst_demo`
- Migration status: all 9 migrations applied; no pending migrations
- Seed status: `seed:manglam-demo` completed
- Tenant slug: `manglam-trading-demo`
- Public intake DB verification: passed
- Native browser-style form submission: `PUB-REQ-2026-0002`
- JSON confirmation submission: `PUB-REQ-2026-0003`
- Thank-you requires saved DB receipt: implemented and locally validated, pending VPS deployment verification

## QA

- External smoke: passed against the existing deployment after the blocked Sprint 39 deploy
- Intake marker smoke: failed after blocked Sprint 39 deployment because the live VPS still serves the previous thank-you implementation
- Public intake page: 200
- Public intake loading marker present: no
- Public form visible markers: passed
- Public intake native form submit: passed, `303` to thank-you flow
- Public intake JSON submit: passed, `PUB-REQ-2026-0003`
- Thank-you page: available
- Failed submit behavior: implemented locally; shows retry/WhatsApp error instead of fake success
- Admin intake queue with internal QA header: 200 and shows `PUB-REQ-2026-0002` and `PUB-REQ-2026-0003`
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

Final readiness: NOT READY FOR SPRINT 39 PUBLIC INTAKE CONFIRMATION QA ON VPS.

The previously deployed public intake link remains reachable, but the Sprint 39 reliability hardening is not live on the VPS yet. Retry `npm run vps:host-key`, `npm run vps:validate`, `npm run vps:deploy`, `npm run vps:smoke`, and `SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke` after SSH port 22 is reachable again.

## Notes

- Root cause: the previous page showed a global loading fallback first and hid the form in a streamed segment that required inline reveal scripts. Browser CSP could block those inline scripts, leaving the spinner visible.
- Fix: native server-rendered public intake form plus form-data parsing on the public submit API.
- Playwright is not installed, so automated browser QA used HTML marker and route-lockdown smoke checks.
- `npm ci` on the VPS reported three moderate npm audit findings. They were not changed in Sprint 38 because remediation may require dependency upgrades outside the public intake scope.
- `npm run vps:validate` currently prints PM2 environment details and should be redacted in a future deployment tooling hardening pass.
- Sprint 39 deploy attempt timestamp: `2026-07-03T12:21:48+05:30`.
- Sprint 39 intake smoke result: failed on live VPS with missing business-name marker on thank-you page, confirming Sprint 39 is not deployed.
- Sprint 39 deploy smoke result: passed against the existing deployment, confirming the old staging app is still reachable.
- CafeLuxe remains untouched; no Sprint 39 remote command progressed past SSH archive upload.
