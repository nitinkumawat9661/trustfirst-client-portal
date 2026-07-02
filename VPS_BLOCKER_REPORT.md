# VPS Blocker Report

## Shared Old VPS Deployment Blocker

Sprint 29 cannot retry deployment because `.env.deploy.local` is missing, so Codex cannot safely identify `DEPLOY_HOST`, `DEPLOY_PORT`, or the trusted host-key gate for the authorized old shared VPS.

No VPS files were changed. No remote database was created. No secrets were committed. No CafeLuxe process, files, database, or Nginx config were modified.

## Status

- Shared old VPS used: no
- Host: not configured
- Host-key status: not verified
- App path: `/var/www/trustfirst-client-portal`
- Env path: `/etc/trustfirst-client-portal.env`
- DB name: `trustfirst_demo`
- DB user: `trustfirst_demo`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- CafeLuxe untouched: yes
- Migrations applied: no
- Seed completed: no
- Smoke passed: no
- Authenticated QA passed: no
- Final demo readiness: BLOCKED

## Checks Performed

Host-key verification command:

```bash
npm run vps:host-key
```

Result:

```text
Host-key verification blocked: .env.deploy.local is missing.
```

`VPS_HOST_KEY_VERIFICATION.md` was generated with decision `not verified`.

## Required Manual Verification

Codex must not bypass this with `StrictHostKeyChecking=no`.

Before deployment can continue, create `.env.deploy.local` from `.env.deploy.example` and include the authorized host, user, key path, shared old VPS confirmations, and one trusted host-key gate:

```bash
DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes
DEPLOY_ALLOW_SHARED_OLD_VPS=yes
DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=<trusted-sha256-fingerprint>
```

or, if the VPS owner has accepted the current fingerprint out-of-band:

```bash
DEPLOY_HOST_KEY_VERIFIED=yes
```

Then run:

```bash
npm run vps:host-key
npm run vps:validate
```

Only continue to bootstrap/deploy after `vps:host-key` repairs `known_hosts` from a verified fingerprint and strict SSH validation succeeds.

## Additional Missing Deployment Input

`.env.deploy.local` is not present in the repository workspace. It is intentionally ignored by git and must not be committed.
