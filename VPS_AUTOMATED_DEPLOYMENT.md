# VPS Automated Deployment

## Status

Automation is prepared, but Codex cannot deploy until authorized VPS host, user, and key are provided.

Do not use the CafeLuxe VPS or any unknown host.

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
DEPLOY_APP_DIR=/var/www/trustfirst-client-portal
DEPLOY_ENV_FILE=/etc/trustfirst-client-portal.env
DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes
```

`.env.deploy.local` is ignored by git and must not be committed.

## Commands

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
- Host looks like CafeLuxe known host/IP/domain.
- SSH host key mismatch occurs.
- The remote `DATABASE_URL` looks production-like.
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

## Deployment Output

After a successful deploy:

- App process runs through PM2 when available.
- If PM2 is unavailable, a systemd service is created.
- If `DEPLOY_DOMAIN` is present and Nginx is available, an HTTP reverse proxy is configured to `127.0.0.1:3000`.
- HTTPS still requires domain DNS and certificate tooling availability on the VPS.
