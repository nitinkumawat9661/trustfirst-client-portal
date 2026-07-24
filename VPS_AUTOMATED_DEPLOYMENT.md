# VPS Automated Deployment

## Runtime Persistence

TrustFirst uses the enabled systemd service `pm2-trustfirst.service` to resurrect `/home/trustfirst/.pm2/dump.pm2` after a reboot or TrustFirst PM2 daemon failure. The saved list contains only `trustfirst-client-portal`, which remains on port `3010` with PM2 auto-restart enabled.

Run the combined SSH and public endpoint health check:

```bash
npm run runtime:health
```

The command verifies the TrustFirst PM2 process, auto-restart, systemd persistence, port `3010`, public intake, Auth.js session endpoint, and anonymous admin lockdown. It does not manage CafeLuxe or port `3000`.

Latest Sprint 41 verification:

- `pm2-trustfirst.service`: enabled and active
- Controlled systemd restart: passed
- Saved process resurrection: passed
- `npm run runtime:health`: passed
- `npm run vps:smoke`: passed
- Public intake smoke: passed, `PUB-REQ-2026-0014`
- Anonymous admin lockdown: preserved
- CafeLuxe untouched: yes

## Status

Automation is active and has successfully deployed TrustFirst Client Portal to the authorized shared VPS using the isolated TrustFirst section.

Sprint 35 HTTPS setup is blocked until `DEPLOY_DOMAIN` is configured and DNS points to the VPS. Temporary HTTP staging login is enabled only for `http://45.10.21.141:3010`. Sprint 37 exposes only the public Manglam intake link to anonymous visitors and keeps admin/client routes locked down.

Do not overwrite, delete, restart, or modify the existing CafeLuxe app, database, Nginx/Caddy config, PM2 process, files, or port `3000`.

## Current Target

- Host: `45.10.x.x`
- Deploy user: `trustfirst`
- App URL: `http://45.10.21.141:3010`
- HTTPS demo URL: blocked, no domain configured
- HTTP staging login: enabled by `TRUSTFIRST_HTTP_STAGING_LOGIN=yes`
- HTTP staging auth bypass: enabled by `TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS=yes` only when `x-trustfirst-internal-qa: yes` is sent
- Public intake URL: `http://45.10.21.141:3010/intake/manglam-trading-demo`
- Public intake browser loading fix: Sprint 38 native server form deployed and verified
- Public intake receipt confirmation: Sprint 39C deployed and verified
- Deployed commit: `a84cfd0e30b39d63d0e9f3f02c63dacc17f280ec`
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

Validation output is redacted. It reports TrustFirst PM2 env key presence only and does not print values for `DATABASE_URL`, `AUTH_SECRET`, passwords, tokens, or keys.

Bootstrap server runtime, PostgreSQL, app directory, local storage, env file, and the isolated UFW rule for `3010/tcp`:

```bash
npm run vps:bootstrap
```

Deploy application, apply migrations, seed Manglam demo, build, start PM2, and run smoke:

```bash
npm run vps:deploy
```

The deploy command prints a final step summary including archive upload, remote extract, `npm ci`, migrations, build, PM2 restart, smoke result, deployed commit hash, and CafeLuxe untouched status.

Run smoke only:

```bash
npm run vps:smoke
```

Run public intake marker and route-lockdown smoke:

```bash
SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke
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

Secrets are written only to the VPS env file and are not printed by validation or deployment scripts. If older local validation logs exposed staging values, follow `STAGING_SECRET_ROTATION_NOTE.md`.

## Latest Deployment Output

- Host-key verification: passed
- SSH validation: passed
- Validation secret redaction: passed
- Bootstrap: passed
- Migrations: all 9 applied
- Seed: `manglam-trading-demo` completed
- Build: passed
- PM2: `trustfirst-client-portal` online
- External smoke: passed
- Public intake smoke: passed, `PUB-REQ-2026-0014`
- Thank-you shows submitted business name: yes
- Admin queue verifies same Submission ID: yes
- Authenticated QA: passed
- CafeLuxe untouched: yes
- Domain configured: no
- DNS resolves: no, not checked because domain is empty
- Nginx TrustFirst site created: no
- HTTPS certificate issued: no
- AUTH_URL updated: no
- PM2 restarted for domain: no
- HTTPS smoke passed: no
- Login status: passed on HTTP staging
- Admin pages open without login: no for public browser traffic; internal QA header required for bypass
- Public intake deployment QA: passed after Sprint 39C receipt confirmation fix
- Manglam full demo QA: passed on HTTP staging
- Final demo readiness: READY FOR HTTP STAGING QA ONLY

## HTTPS Note

No TrustFirst domain is configured yet, so the current staging URL is direct HTTP on port `3010`. Configure `demo.trustfirstsolutions.in` with an A record to `45.10.21.141`, then set `DEPLOY_DOMAIN=demo.trustfirstsolutions.in` in `.env.deploy.local` before rerunning domain setup. Do not fake HTTPS.

Remove `TRUSTFIRST_HTTP_STAGING_LOGIN=yes` after HTTPS is configured.
