# Smoke Tests

## Script

Run against local or preview URL:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run deploy:smoke
SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run deploy:smoke
```

Optional print preview document:

```bash
SMOKE_PRINT_DOCUMENT_ID=doc_123 SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run deploy:smoke
```

## Covered Routes

- Auth route: `/api/auth/session`
- Manifest: `/manifest.webmanifest`
- Offline page: `/offline`
- Hardware demo page: `/admin/hardware/demo`
- Billing page: `/admin/billing`
- Hardware dashboard: `/admin/hardware/inventory`
- Print preview: `/admin/hardware/print/{documentId}`

Protected pages may return redirects or authorization responses when smoke tests run without an authenticated browser session. The smoke script treats those as route availability signals and fails on unexpected server or routing errors.

## Manual Follow-Up

After automated smoke:

- Sign in as demo admin.
- Open `/admin/release-checklist`.
- Open `/admin/hardware/demo`.
- Print preview a real hardware document.
- Toggle browser offline mode and confirm offline queue UI remains visible.
