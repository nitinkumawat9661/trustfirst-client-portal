# VPS Access Requirements

## Status

Access is now configured and verified for the authorized shared VPS.

HTTPS demo-domain access is not configured yet because `DEPLOY_DOMAIN` is empty.

## Verified Access

- Host: `45.10.x.x`
- SSH user: `trustfirst`
- Sudo: passwordless sudo available for deployment tasks
- Key: dedicated TrustFirst deploy private key on the developer machine
- Host-key verification: passed
- Trusted fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Strict SSH: passed
- `.env.deploy.local`: exists locally and remains uncommitted
- `DEPLOY_DOMAIN`: empty

## Required Local Values

The ignored `.env.deploy.local` must contain:

- `DEPLOY_HOST=45.10.21.141`
- `DEPLOY_USER=trustfirst`
- `DEPLOY_PORT=22`
- `DEPLOY_KEY_PATH=%USERPROFILE%\.ssh\trustfirst_vps_ed25519`
- `DEPLOY_DOMAIN=`
- `DEPLOY_APP_PORT=3010`
- `DEPLOY_APP_DIR=/var/www/trustfirst-client-portal`
- `DEPLOY_ENV_FILE=/etc/trustfirst-client-portal.env`
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes`
- `DEPLOY_ALLOW_SHARED_OLD_VPS=yes`
- `DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`

Do not commit `.env.deploy.local`, private keys, generated passwords, `AUTH_SECRET`, or VPS env files.

## Domain Requirement

Before configuring HTTPS, create:

```text
demo.trustfirstsolutions.in A 45.10.21.141
```

Then update only ignored `.env.deploy.local`:

```bash
DEPLOY_DOMAIN=demo.trustfirstsolutions.in
```

## Server Permissions Used

The `trustfirst` user can:

- Install/check packages with `sudo`.
- Create `/var/www/trustfirst-client-portal`.
- Create `/etc/trustfirst-client-portal.env`.
- Create PostgreSQL database/user `trustfirst_demo`.
- Start/restart only PM2 process `trustfirst-client-portal`.
- Add UFW allow rule for `3010/tcp`.

## Explicitly Forbidden

- Do not alter CafeLuxe app files, database, Nginx/Caddy site, PM2 process, or runtime.
- Do not use port `3000`; TrustFirst must use `3010`.
- Do not use a CafeLuxe app path, env file, database, or PM2 process name.
- Do not deploy if OpenSSH reports a host-key mismatch.
- Do not use `StrictHostKeyChecking=no`.
- Do not use production databases.
- Do not commit `.env.deploy.local` or `/etc/trustfirst-client-portal.env`.
- Do not commit private SSH keys.

## Current Deployment Result

- App URL: `http://45.10.21.141:3010`
- DB status: `trustfirst_demo` configured
- Migration status: applied
- Seed status: completed
- Smoke status: passed
- Authenticated QA status: passed
- CafeLuxe untouched: yes
- HTTPS status: blocked by missing domain
- Final demo readiness: READY FOR STAGING QA ONLY
