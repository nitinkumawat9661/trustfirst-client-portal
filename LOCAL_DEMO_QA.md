# Local Demo QA

## Automated Checks

Run:

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run db:generate
```

After PostgreSQL is running:

```bash
npm run demo:setup
```

Expected `demo:manglam` verification:

- Tenant slug exists: `manglam-trading-demo`
- Demo admin user exists
- Hardware settings exist
- Product categories exist
- Products exist
- Stock locations exist
- Opening stock movements exist
- Customers and suppliers exist
- Demo trade documents exist

## Manual Local Routes

Open:

- `http://localhost:3000/admin/release-checklist`
- `http://localhost:3000/admin/hardware/demo`
- `http://localhost:3000/admin/hardware/demo/manglam`
- `http://localhost:3000/admin/hardware/products`
- `http://localhost:3000/admin/hardware/inventory`
- `http://localhost:3000/admin/hardware/sales/new`
- `http://localhost:3000/admin/billing`
- `http://localhost:3000/offline`
- `http://localhost:3000/manifest.webmanifest`

## Acceptance

The local demo is acceptable when:

- The release checklist shows database, auth, hardware demo, print, PWA, offline queue, and local demo mode as ready.
- Manglam configuration page loads from configuration.
- Catalog and stock data are visible.
- Quotation, sale, invoice draft, print preview, and manual payment flows can be demonstrated.
- Offline queue panel is visible.
