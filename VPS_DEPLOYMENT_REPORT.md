# VPS Deployment Report

## Status

Sprint 28 deployment is blocked before bootstrap because strict SSH host-key verification fails for the authorized old shared VPS target. Deployment automation has been updated to support isolated shared-VPS deployment only when both confirmation flags are present.

## Shared Old VPS Deployment

- Old VPS used: no
- Host masked: 45.10.x.x
- Host-key status: blocked - remote host identification changed
- App path: `/var/www/trustfirst-client-portal`
- Env path: `/etc/trustfirst-client-portal.env`
- DB name: `trustfirst_demo`
- DB user: `trustfirst_demo`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- URL: not available
- CafeLuxe untouched: yes
- Migrations applied: no
- Seed completed: no
- Smoke passed: no
- Authenticated QA passed: no
- Final demo readiness: NOT READY FOR CLIENT DEMO

## Validation Result

Known host lookup found existing entries for `45.10.21.141`.

Strict read-only SSH failed with:

```text
REMOTE HOST IDENTIFICATION HAS CHANGED
Offending ECDSA key in C:\Users\DELL/.ssh/known_hosts:5
Host key verification failed.
```

Because host identity is not clean, no bootstrap, database provisioning, deployment, migration, seed, smoke, or authenticated QA was attempted.

## Environment

- `.env.deploy.local`: missing
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM`: required
- `DEPLOY_ALLOW_SHARED_OLD_VPS`: required
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

See `VPS_BLOCKER_REPORT.md` for the safe host-key verification and known_hosts repair commands.
