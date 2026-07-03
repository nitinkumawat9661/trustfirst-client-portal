# VPS Automated Deployment

## Status

Automation is active and has successfully deployed TrustFirst Client Portal to the authorized shared VPS using the isolated TrustFirst section.

Sprint 35 HTTPS setup is blocked until `DEPLOY_DOMAIN` is configured and DNS points to the VPS.

Do not overwrite, delete, restart, or modify the existing CafeLuxe app, database, Nginx/Caddy config, PM2 process, files, or port `3000`.

## Current Target

- Host: `45.10.x.x`
- Deploy user: `trustfirst`
- App URL: `http://45.10.21.141:3010`
- HTTPS demo URL: blocked, no domain configured
- App path: `/var/www/trustfirst-client-portal`
- Env file: `/etc/trustfirst-client-portal.env`
- DB name: `trustfirst_demo`
- DB user: `trustfirst_demo`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- Trusted host fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`

## Commands

Collect and verify host-key evidence:

```bash
npm run vps:host-key
```

Validate read-only SSH access:

```bash
npm run vps:validate
```

Bootstrap server runtime, PostgreSQL, app directory, local storage, env file, and the isolated UFW rule for `3010/tcp`:

```bash
npm run vps:bootstrap
```

Deploy application, apply migrations, seed Manglam demo, build, start PM2, and run smoke:

```bash
npm run vps:deploy
```

Run smoke only:

```bash
npm run vps:smoke
```

Generate/update report:

```bash
npm run vps:report
```

## Safety Rules

The scripts refuse to continue when:

- `DEPLOY_HOST` is missing.
- `DEPLOY_USER` is missing.
- `DEPLOY_KEY_PATH` is missing or does not exist.
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM` is not `yes`.
- `DEPLOY_ALLOW_SHARED_OLD_VPS` is not `yes`.
- Neither `DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256` nor `DEPLOY_HOST_KEY_VERIFIED=yes` is configured.
- `DEPLOY_APP_DIR` is not `/var/www/trustfirst-client-portal`.
- `DEPLOY_ENV_FILE` is not `/etc/trustfirst-client-portal.env`.
- `DEPLOY_APP_PORT` is not `3010`.
- TrustFirst path, env file, or PM2 process points to CafeLuxe.
- The app port is already used by another non-TrustFirst service.
- SSH host-key mismatch occurs.
- The remote `DATABASE_URL` looks production-like.
- The remote `DATABASE_URL` does not use database `trustfirst_demo` and user `trustfirst_demo`.
- The deployment env file would live inside the git app directory.

## Deployment Method

The deploy script creates a `git archive` from local committed `HEAD`, uploads it over verified SSH, extracts it only into `/var/www/trustfirst-client-portal`, and preserves `/var/www/trustfirst-client-portal/storage`.

This avoids relying on `origin/main`, which currently has no visible remote branch head.

## What Bootstrap Creates

- `/var/www/trustfirst-client-portal`
- `/var/www/trustfirst-client-portal/storage/uploads`
- `/etc/trustfirst-client-portal.env`
- PostgreSQL database `trustfirst_demo`
- PostgreSQL user `trustfirst_demo`
- Generated `AUTH_SECRET`
- Generated database password
- Generated local demo admin password
- UFW allow rule for `3010/tcp`

Secrets are written only to the VPS env file and are never printed by the scripts.

## Latest Deployment Output

- Host-key verification: passed
- SSH validation: passed
- Bootstrap: passed
- Migrations: all 9 applied
- Seed: `manglam-trading-demo` completed
- Build: passed
- PM2: `trustfirst-client-portal` online
- External smoke: passed
- Authenticated QA: passed
- CafeLuxe untouched: yes
- Domain configured: no
- DNS resolves: no, not checked because domain is empty
- Nginx TrustFirst site created: no
- HTTPS certificate issued: no
- AUTH_URL updated: no
- PM2 restarted for domain: no
- HTTPS smoke passed: no
- Final demo readiness: READY FOR STAGING QA ONLY

## HTTPS Note

No TrustFirst domain is configured yet, so the current staging URL is direct HTTP on port `3010`. Configure `demo.trustfirstsolutions.in` with an A record to `45.10.21.141`, then set `DEPLOY_DOMAIN=demo.trustfirstsolutions.in` in `.env.deploy.local` before rerunning domain setup. Do not fake HTTPS.
