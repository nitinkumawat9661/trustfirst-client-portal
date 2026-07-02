# VPS Deployment Report

## Status

Sprint 29 deployment retry is blocked before host-key collection because `.env.deploy.local` is missing. Codex cannot safely identify `DEPLOY_HOST`, collect the current server key, compare a trusted fingerprint, repair `known_hosts`, or run isolated deployment.

## Shared Old VPS Deployment

- Old VPS used: no
- Host masked: not configured
- Host-key status: not verified
- Known_hosts repaired: no
- Backup path: not created
- App path: `/var/www/trustfirst-client-portal`
- Env path: `/etc/trustfirst-client-portal.env`
- DB name: `trustfirst_demo`
- DB user: `trustfirst_demo`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- URL: not available
- CafeLuxe untouched: yes
- Deployment attempted: no
- Migrations applied: no
- Seed completed: no
- Smoke passed: no
- Authenticated QA passed: no
- Final demo readiness: NOT READY FOR CLIENT DEMO

## Validation Result

Host-key verification command:

```bash
npm run vps:host-key
```

Result: blocked because `.env.deploy.local` is missing.

Because host identity is not verified, no `known_hosts` repair, bootstrap, database provisioning, deployment, migration, seed, smoke, or authenticated QA was attempted.

## Environment

- `.env.deploy.local`: missing
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM`: required
- `DEPLOY_ALLOW_SHARED_OLD_VPS`: required
- `DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256` or `DEPLOY_HOST_KEY_VERIFIED=yes`: required
- `DEPLOY_APP_PORT`: must be `3010`
- Deployment env file on VPS: not created
- Storage directory on VPS: not created

## Database

- PostgreSQL setup: not performed
- Database `trustfirst_demo`: not created
- User `trustfirst_demo`: not created
- Migration status: not applied
- Seed status: not completed

## QA

- Smoke passed: no
- Authenticated QA passed: no
- Manglam demo QA passed: no
- Final demo readiness: BLOCKED

## Blocker

See `VPS_BLOCKER_REPORT.md` and `VPS_HOST_KEY_VERIFICATION.md`.
