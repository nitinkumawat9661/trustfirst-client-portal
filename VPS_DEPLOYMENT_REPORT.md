# VPS Deployment Report

## Status

TrustFirst Client Portal is deployed on the authorized shared VPS for the Mangalam Sanitary demo path.

- Deployed commit: `58262184f1753f9a9a631b3864308c90dc3529d1`
- Deployment target: `https://client.trustfirstsolutions.in`
- Public intake: `https://client.trustfirstsolutions.in/intake/manglam-trading-demo`
- Shared VPS isolation: yes
- CafeLuxe untouched: yes
- Final readiness: PARTIAL STAGING READY, NOT FINAL CLIENT HANDOVER

## Target

- Host: `45.10.x.x`
- Deploy user: `trustfirst`
- App directory: `/var/www/trustfirst-client-portal`
- Env file: `/etc/trustfirst-client-portal.env`
- App port: `3010`, loopback-only behind Nginx
- PM2 process: `trustfirst-client-portal`
- PM2 persistence service: `pm2-trustfirst.service`
- Database: `trustfirst_demo`
- Database user: `trustfirst_demo`

## Deployment

- SSH access: passed
- Host-key verification: passed with trusted ED25519 SHA256 fingerprint
- Archive deploy from local HEAD: passed
- `npm ci`: passed
- `npm run deploy:env`: passed
- `npm run db:generate`: passed
- `npm run deploy:migration-check`: passed
- `npm run deploy:migration-check -- --apply`: passed
- Pending migrations applied: `20260727052551_financial_transactions`, `20260727070500_hardware_day_closing`
- `npm run seed:manglam-demo`: completed; official tenant identity lock preserved
- Production build on VPS: passed
- PM2 restart: restarted only `trustfirst-client-portal`

## QA

- `npm run runtime:health`: passed
- `npm run vps:smoke`: passed against `https://client.trustfirstsolutions.in`
- `SMOKE_BASE_URL=https://client.trustfirstsolutions.in npm run intake:smoke`: passed
- Latest intake smoke submission: `PUB-REQ-2026-0014`
- Public intake page: HTTP `200`
- Auth.js session endpoint: HTTP `200`
- Anonymous admin lockdown: HTTP `307`
- Public admin queue exposure: blocked
- Private queue verification: passed over verified SSH without printing secrets
- Route lockdown preserved: yes

## Delivered In This Release

- Hardware purchase return workflow
- Hardware day closing with duplicate close prevention and authorized reopen
- Payment receipt and supplier voucher print/reprint route
- Customer and supplier ledger statement print route
- Dynamic public intake thank-you confirmation
- Intake smoke verification hardened for locked admin routes

## Known Limits

- Direct public access to raw `http://45.10.21.141:3010` is not the acceptance path; port `3010` is loopback-only by runtime-health design.
- Physical printer output is not verified.
- `npm audit --omit=dev` still reports high findings in Next transitive `postcss` and `sharp`; npm only offers a breaking forced downgrade path, so no unsafe automated fix was applied.
- Full authenticated browser acceptance for every operator workflow is still pending.
- Production backup/canary workflow was not fully executed by separate release directories in this run; the existing deploy script performs an isolated app restart on the TrustFirst PM2 process.
