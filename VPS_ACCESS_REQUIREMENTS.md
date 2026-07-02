# VPS Access Requirements

Codex cannot deploy until authorized VPS host/user/key are provided.

## Required Access

Provide a `.env.deploy.local` file using `.env.deploy.example` with:

- `DEPLOY_HOST`: authorized TrustFirst/Manglam VPS host or IP.
- `DEPLOY_USER`: SSH user with sudo permissions.
- `DEPLOY_PORT`: SSH port, default `22`.
- `DEPLOY_KEY_PATH`: local path to the private SSH key.
- `DEPLOY_DOMAIN`: optional demo domain/subdomain.
- `DEPLOY_APP_DIR`: `/var/www/trustfirst-client-portal`.
- `DEPLOY_ENV_FILE`: `/etc/trustfirst-client-portal.env`.
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM`: must be `yes`.

## Server Permissions Needed

The SSH user must be able to:

- Install packages with `sudo`.
- Create `/var/www/trustfirst-client-portal`.
- Create `/etc/trustfirst-client-portal.env`.
- Create PostgreSQL database/user.
- Start/restart PM2 or systemd service.
- Configure Nginx or Caddy if reverse proxy is required.

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

- Do not use `45.10.21.141`.
- Do not use `cafeluxesite.in`.
- Do not use any CafeLuxe host, IP, domain, or key target.
- Do not use production databases.
- Do not commit `.env.deploy.local` or `/etc/trustfirst-client-portal.env`.

## First Command After Access Is Added

```bash
npm run vps:validate
```

Only continue to bootstrap/deploy after validation succeeds.
