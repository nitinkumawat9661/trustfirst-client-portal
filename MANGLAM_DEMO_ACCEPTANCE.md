# Manglam Demo Acceptance

## Checklist

| Area | Acceptance signal | Status |
| --- | --- | --- |
| Settings ready | Demo tenant has configurable firm name, placeholders, prefixes, financial year, GST mode, round-off, and default stock location. | Ready |
| Catalog ready | Pipes, fittings, taps, valves, cement items, bathroom accessories, sanitary ware, and fastener samples exist. | Ready |
| Stock ready | Opening stock is seeded into the default location with tenant-scoped movement records. | Ready |
| Quotation ready | Catalog-backed quotation flow is available from the hardware sales UI. | Ready |
| Sale ready | Quotation can convert to sale and confirmed sale can deduct stock through existing rules. | Ready |
| Invoice print ready | Browser print preview uses tenant branding and print projection. | Ready |
| Payment ready | Manual payment entry is available through billing foundation. | Partial |
| Reports ready | Daily sales, purchase summary, stock movement, low stock, and outstanding report areas are present. | Ready |
| Offline queue ready | Offline banner, pending actions, failed actions, retry, and sync status are present. | Ready |

## Known Limitations

- No live payment gateway is connected.
- No full accounting ledger is implemented.
- No native mobile app or offline file sync is implemented.
- Placeholder GSTIN, address, phone, and email must be replaced before production use.
- Supplier outstanding is represented as a contract/foundation, not a complete accounts payable module.
