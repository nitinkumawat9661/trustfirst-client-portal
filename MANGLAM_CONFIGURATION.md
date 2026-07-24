# Manglam Trading Configuration

> **Superseded identity notice:** Placeholder firm identity in this historical demo configuration is `SUPERSEDED_DEMO_CONFIGURATION`. The authoritative identity is defined in `MANGLAM_OFFICIAL_IDENTITY.md`. The stable technical slug remains `manglam-trading-demo`.

## Scope

This configuration pack prepares a demo tenant for a hardware and sanitary business without changing platform business logic. Firm-specific values live in configuration, seed data, documentation, and the requested demo route only.

## Tenant

- Tenant slug: `manglam-trading-demo`
- Firm name: configurable as `Manglam Trading Company`
- Business type: `hardware and sanitary`
- GSTIN: placeholder only
- Address: placeholder only
- Phone: placeholder only
- Email: placeholder only

## Hardware Settings

- Invoice prefix: `MTC-INV`
- Quotation prefix: `MTC-QUO`
- Financial year: `2026-2027`
- Default GST mode: `exclusive`
- Round-off: enabled
- Default stock location: `MAIN` / `Main Godown`

## Seed Commands

```bash
npm run seed:manglam-demo
npm run reset:manglam-demo
```

The commands are idempotent and tenant-scoped. Reset removes only the sample rows identified by the configuration pack.

## Security Notes

- No real customer, supplier, GSTIN, address, phone, or confidential business data is included.
- Live payment gateways are not connected.
- Multi-tenant isolation remains enforced through existing tenant IDs and permissions.
