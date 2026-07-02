# Release Checklist

## Local Gate

Run:

```bash
npm run deploy:env
npm run deploy:migration-check
npm run db:generate
npm run lint
npm run typecheck
npm run build
npm test
```

## Demo Seed

For preview:

```bash
DEMO_ADMIN_EMAIL=demo-admin@example.com DEMO_ADMIN_PASSWORD="replace-with-strong-password" npm run seed:demo
```

To reset only the generic demo sample data before reseeding:

```bash
npm run seed:demo -- --reset
```

## Admin Release Page

Open `/admin/release-checklist` and verify:

- Environment status.
- Database status.
- Auth status.
- Hardware demo status.
- PWA status.
- Print status.
- Offline queue status.

## Hardware Demo Page

Open `/admin/hardware/demo` and verify:

- Business settings.
- Stock location.
- Products.
- Customers.
- Print readiness.
- Offline readiness.

## Go/No-Go

Release only after smoke tests pass and the release checklist has no unexpected failures.
