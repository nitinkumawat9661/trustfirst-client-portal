# VPS Automated Deployment

## Status

Automation is prepared for the authorized old shared VPS, but deployment must stop until strict SSH host-key verification succeeds.

The old shared VPS may be used only as an isolated TrustFirst section. Do not overwrite, delete, restart, or modify the existing CafeLuxe app, database, Nginx config, PM2 process, or files.

## Configure Access

Copy the template:

```bash
cp .env.deploy.example .env.deploy.local
```

Fill:

```bash
DEPLOY_HOST=<authorized-trustfirst-vps-host>
DEPLOY_USER=<ssh-user>
DEPLOY_PORT=22
DEPLOY_KEY_PATH=<path-to-private-key>
DEPLOY_DOMAIN=<optional-demo-domain>
DEPLOY_APP_PORT=3010
DEPLOY_APP_DIR=/var/www/trustfirst-client-portal
DEPLOY_ENV_FILE=/etc/trustfirst-client-portal.env
DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes
DEPLOY_ALLOW_SHARED_OLD_VPS=yes
DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=<trusted-sha256-fingerprint>
DEPLOY_HOST_KEY_VERIFIED=
```

`.env.deploy.local` is ignored by git and must not be committed.

## Commands

Collect and verify host-key evidence before SSH validation:

```bash
npm run vps:host-key
```

Validate read-only SSH access:

```bash
npm run vps:validate
```

Bootstrap server runtime, PostgreSQL, app directory, local storage, and env file:

```bash
npm run vps:bootstrap
```

Deploy application, apply migrations, seed Manglam demo, build, start process manager, configure reverse proxy when a domain is present, and run smoke:

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
- The app port is already used by another running service.
- SSH host key mismatch occurs.
- The remote `DATABASE_URL` looks production-like.
- The remote `DATABASE_URL` does not use database `trustfirst_demo` and user `trustfirst_demo`.
- The deployment env file would live inside the git app directory.

## What Bootstrap Creates

- `/var/www/trustfirst-client-portal`
- `/var/www/trustfirst-client-portal/storage/uploads`
- `/etc/trustfirst-client-portal.env`
- PostgreSQL database `trustfirst_demo`
- PostgreSQL user `trustfirst_demo`
- Generated `AUTH_SECRET`
- Generated database password
- Generated local demo admin password

Secrets are written only to the VPS env file and are never printed by the scripts.

## Shared Old VPS Deployment

- Old VPS used: no, currently blocked by SSH public-key authentication failure.
- `.env.deploy.local` created: yes.
- Host masked: `45.10.x.x`.
- Host-key status: trusted fingerprint matched.
- Key path exists: yes.
- Current fingerprint collected: yes.
- Trusted fingerprint configured: yes.
- Trusted fingerprint used: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`.
- Known_hosts repaired: yes.
- Backup path: `C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260702181522`.
- Strict SSH validation passed: no.
- App path: `/var/www/trustfirst-client-portal`.
- Env path: `/etc/trustfirst-client-portal.env`.
- DB name: `trustfirst_demo`.
- DB user: `trustfirst_demo`.
- App port: `3010`.
- PM2 process: `trustfirst-client-portal`.
- CafeLuxe untouched: yes.
- Migrations applied: no.
- Seed completed: no.
- Smoke passed: no.
- Authenticated QA passed: no.
- Final demo readiness: blocked.

The current blocker is SSH authorization: strict host checking accepts the verified key, but `root@45.10.21.141` rejects both available private keys with `Permission denied (publickey)`.

If OpenSSH reports `REMOTE HOST IDENTIFICATION HAS CHANGED`, do not deploy. Verify the fingerprint out-of-band, set the trusted gate in `.env.deploy.local`, then let the verification script repair `known_hosts` safely:

```bash
npm run vps:host-key
npm run vps:validate
```

If `ssh-keyscan` fails with `choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com`, collect the trusted host key using an updated OpenSSH client or from the VPS provider console before setting the trusted gate.

On this machine, Git for Windows `ssh-keyscan` collected current host fingerprints successfully once:

- ED25519: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- RSA: `SHA256:U/yYcVMljDyvORobFkagh5xyj+XmVLeed8MQt/MlwmY`
- ECDSA: `SHA256:xTzBtiL+q/EsSR3/2buZioRuZl/z64QeXJJjvJe86vA`

## Deployment Output

After a successful deploy:

- App process runs through PM2 when available.
- If PM2 is unavailable, a systemd service is created.
- If `DEPLOY_DOMAIN` is present and Nginx is available, an HTTP reverse proxy is configured to `127.0.0.1:3010`.
- HTTPS still requires domain DNS and certificate tooling availability on the VPS.
