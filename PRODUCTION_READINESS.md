# Production Readiness

## Hardware ERP Hardening

Implemented hardening includes:

- Duplicate SKU prevention.
- Duplicate barcode prevention.
- Duplicate draft invoice prevention for hardware documents.
- Invalid GST rate rejection.
- Stock-out prevention beyond available stock.
- Invalid manual payment amount rejection.
- Tenant-scoped link validation.
- Demo setup readiness projection.

## Operational Notes

- Hardware demo reset is limited to the generic demo sample set.
- Offline queue stores sanitized client-side draft payloads only.
- Server APIs remain the authority for tenant, permission, and ownership validation.
- Live payment gateways remain disabled.

## Build Notes

Before preview or production:

- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Run `npm test`.
- Run `npm run db:generate`.

## Release Gate

Do not present the client demo until `/admin/hardware/demo` shows settings, stock location, products, customers, print readiness, and offline readiness as complete or intentionally accepted.
