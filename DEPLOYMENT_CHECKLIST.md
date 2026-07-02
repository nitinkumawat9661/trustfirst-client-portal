# Deployment Checklist

## Environment

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` for preview and production callbacks

Recommended:

- Production domain configured before stakeholder demo.
- Secure HTTPS endpoint.
- Database backup or disposable preview database before demo reset testing.

## Vercel Preview

- Configure environment variables for the preview project.
- Run Prisma migrations against the preview database.
- Run `npm run build`.
- Verify `/manifest.webmanifest` and `/offline`.
- Open `/admin/hardware/demo` and confirm readiness.
- Test print preview in the target browser.

## VPS Deployment

- Install Node.js 20.9 or newer.
- Install PostgreSQL or configure managed PostgreSQL.
- Set environment variables at the process manager level.
- Run `npm ci`.
- Run `npm run db:generate`.
- Run Prisma migrations.
- Run `npm run build`.
- Start with `npm run start --workspace @trustfirst/web` behind HTTPS reverse proxy.

## Migration Checklist

- Review generated migration SQL.
- Backup the database before applying production migrations.
- Apply migrations before starting the new app version.
- Run smoke tests for auth, hardware inventory, billing, print preview, and offline queue UI.
