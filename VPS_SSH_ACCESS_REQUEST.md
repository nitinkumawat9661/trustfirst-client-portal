# VPS SSH Access Request

## Purpose

TrustFirst Client Portal needs isolated SSH access to the verified shared VPS so the app can be deployed without touching CafeLuxe resources.

Host:

```text
45.10.21.141
```

Preferred deploy user:

```text
trustfirst
```

Alternative deploy user:

```text
deploy
```

## Public Key To Add

Add this public key only. Do not request or copy the private key.

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO6Nk17CaQvKajV6Lc2sO5X5PL3oL0fNRsyrUkG6HX/R trustfirst-client-portal-deploy
```

## Exact authorized_keys Line

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO6Nk17CaQvKajV6Lc2sO5X5PL3oL0fNRsyrUkG6HX/R trustfirst-client-portal-deploy
```

## Required Isolation

Grant access only for the TrustFirst isolated section:

- App directory: `/var/www/trustfirst-client-portal`
- Upload storage: `/var/www/trustfirst-client-portal/storage/uploads`
- Env file: `/etc/trustfirst-client-portal.env`
- PostgreSQL database: `trustfirst_demo`
- PostgreSQL user: `trustfirst_demo`
- PM2 process: `trustfirst-client-portal`
- App port: `3010`

Do not grant or use access to CafeLuxe app paths, database, PM2 process, Nginx/Caddy site, files, or port `3000`.

## Suggested VPS Console Commands

Run these from the VPS console as root or another administrative user:

```bash
adduser --disabled-password --gecos "" trustfirst
mkdir -p /home/trustfirst/.ssh
printf '%s\n' 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIO6Nk17CaQvKajV6Lc2sO5X5PL3oL0fNRsyrUkG6HX/R trustfirst-client-portal-deploy' >> /home/trustfirst/.ssh/authorized_keys
chown -R trustfirst:trustfirst /home/trustfirst/.ssh
chmod 700 /home/trustfirst/.ssh
chmod 600 /home/trustfirst/.ssh/authorized_keys
```

## Required sudo Permissions

The deploy user needs sudo access for these TrustFirst-only actions:

- Install/check Node.js, npm, Git, PostgreSQL, Nginx/Caddy, and PM2 if missing.
- Create and own `/var/www/trustfirst-client-portal`.
- Create `/var/www/trustfirst-client-portal/storage/uploads`.
- Create `/etc/trustfirst-client-portal.env` with mode `600`.
- Create PostgreSQL database/user `trustfirst_demo`.
- Start/restart only PM2 process `trustfirst-client-portal` or its systemd service.
- Add a separate TrustFirst reverse proxy site only if a TrustFirst domain is provided.

Do not restart, delete, or alter CafeLuxe services.

## Validation After Access Is Added

Update local `.env.deploy.local` only:

```bash
DEPLOY_USER=trustfirst
DEPLOY_KEY_PATH=%USERPROFILE%\.ssh\trustfirst_vps_ed25519
```

Then run:

```bash
npm run vps:validate
```

Only continue to bootstrap/deploy after strict SSH validation succeeds.
