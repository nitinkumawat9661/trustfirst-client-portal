# Vercel Preview

## Environment Variables

Configure preview-scoped variables in Vercel:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`

Use a preview database, not the production database.

## Local Preview Preparation

```bash
vercel env pull .env.local --environment=preview --yes
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
npm run seed:demo
npm run lint
npm run typecheck
npm run build
npm test
```

## Preview Deploy

With Git integration, push to a non-production branch and Vercel creates a preview deployment. For CLI preview:

```bash
vercel pull --yes --environment=preview
vercel build
vercel deploy --prebuilt
```

## Migration Flow

Preview migrations should run against the preview database before stakeholder testing:

```bash
npm run deploy:migration-check
npm run deploy:migration-check -- --apply
```

## Smoke Checklist

After deploy:

```bash
SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run deploy:smoke
```

Then open:

- `/admin/release-checklist`
- `/admin/hardware/demo`
- `/admin/hardware/inventory`
- `/offline`
- `/manifest.webmanifest`

## Promotion Rule

Do not promote a preview unless release checklist, smoke tests, auth, hardware demo, print preview, PWA, and offline queue status are accepted.
