# VPS Deployment

## Runtime

- Node.js 20.9 or newer.
- npm 10 or newer.
- PostgreSQL 14 or newer.
- HTTPS reverse proxy.
- Process manager such as systemd or PM2.

## Environment

Set server environment variables outside the repository:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`

Never commit production secrets.

## Install

```bash
git pull
npm ci
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
```

## Migrations

Backup first:

```bash
pg_dump "$DATABASE_URL" > backup-before-release.sql
npm run deploy:migration-check -- --apply
```

## Build And Start

```bash
npm run build
npm run start --workspace @trustfirst/web
```

## Reverse Proxy

Route HTTPS traffic to the Next.js server, usually `127.0.0.1:3000`. Ensure:

- TLS certificate is valid.
- `Host` header is preserved.
- WebSocket upgrades are allowed for future realtime features.
- Request body size limits match upload policy.

## Process Manager

Use systemd or PM2 with:

- Restart on failure.
- Log rotation.
- Environment file outside git.
- Health checks against `/api/health`.

## Backup Notes

- Backup PostgreSQL before every migration.
- Keep at least one known-good backup from before preview promotion.
- Test restore on a disposable database before relying on the backup plan.
