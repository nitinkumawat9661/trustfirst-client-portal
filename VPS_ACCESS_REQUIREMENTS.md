# VPS Access Requirements

Codex cannot deploy until the authorized old shared VPS host/user/key are configured and strict SSH host-key verification succeeds.

Sprint 33 generated a dedicated TrustFirst deploy key locally. The public key request is documented in `VPS_SSH_ACCESS_REQUEST.md`; the private key is not committed.

## Required Access

Provide a `.env.deploy.local` file using `.env.deploy.example` with:

- `DEPLOY_HOST`: authorized TrustFirst/Manglam VPS host or IP.
- `DEPLOY_USER`: SSH user with sudo permissions.
- `DEPLOY_PORT`: SSH port, default `22`.
- `DEPLOY_KEY_PATH`: local path to the private SSH key.
- `DEPLOY_DOMAIN`: optional demo domain/subdomain.
- `DEPLOY_APP_PORT`: must be `3010`.
- `DEPLOY_APP_DIR`: `/var/www/trustfirst-client-portal`.
- `DEPLOY_ENV_FILE`: `/etc/trustfirst-client-portal.env`.
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM`: must be `yes`.
- `DEPLOY_ALLOW_SHARED_OLD_VPS`: must be `yes`.

## Server Permissions Needed

The SSH user must be able to:

- Install packages with `sudo`.
- Create `/var/www/trustfirst-client-portal`.
- Create `/etc/trustfirst-client-portal.env`.
- Create PostgreSQL database/user `trustfirst_demo`.
- Start/restart only PM2 process `trustfirst-client-portal` or its systemd service.
- Configure a separate TrustFirst Nginx or Caddy site if reverse proxy is required.

## Server Requirements

The bootstrap script checks or installs:

- Node.js `20.9+`
- npm `10+`
- PostgreSQL `14+`
- Git
- Nginx
- PM2
- Build tooling

## Explicitly Forbidden

- Do not alter CafeLuxe app files, database, Nginx/Caddy site, PM2 process, or runtime.
- Do not use port `3000`; TrustFirst must use `3010`.
- Do not use a CafeLuxe app path, env file, database, or PM2 process name.
- Do not deploy if OpenSSH reports a host-key mismatch.
- Do not use `StrictHostKeyChecking=no`.
- Do not use production databases.
- Do not commit `.env.deploy.local` or `/etc/trustfirst-client-portal.env`.
- Do not commit private SSH keys.

## Shared Old VPS Deployment

- Old VPS used: no, currently blocked.
- Host masked: `45.10.x.x`.
- Host-key status: blocked by `REMOTE HOST IDENTIFICATION HAS CHANGED`.
- App path: `/var/www/trustfirst-client-portal`.
- Env path: `/etc/trustfirst-client-portal.env`.
- DB name: `trustfirst_demo`.
- DB user: `trustfirst_demo`.
- App port: `3010`.
- PM2 process: `trustfirst-client-portal`.
- CafeLuxe untouched: yes.
- Final demo readiness: blocked until the host key is verified and `.env.deploy.local` exists.
- SSH access request: see `VPS_SSH_ACCESS_REQUEST.md`.

## First Command After Access Is Added

```bash
npm run vps:validate
```

Only continue to bootstrap/deploy after validation succeeds.
