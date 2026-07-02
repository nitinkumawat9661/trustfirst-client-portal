# Client Demo Script

## Login

1. Start the local demo:

```bash
npm run demo:start
```

2. Open:

```text
http://localhost:3000/sign-in
```

3. Sign in with:

```text
manglam-demo-admin@trustfirst.example.com
```

Use the generated `MANGLAM_DEMO_ADMIN_PASSWORD` from `.env.demo.local`.

## Walkthrough

1. Open `/admin/hardware/demo/manglam`.
2. Show local demo configuration, firm settings, GST placeholders, prefixes, financial year, GST mode, round-off, and default stock location.
3. Open `/admin/hardware/products`.
4. Show product categories, brands, units, barcodes, GST rates, sale prices, and purchase costs.
5. Open `/admin/hardware/inventory`.
6. Show opening stock and stock movement readiness.
7. Open `/admin/hardware/sales/new`.
8. Create a quotation using seeded catalog items.
9. Convert the quotation to a sale.
10. Confirm the sale and verify stock deduction.
11. Create or open the invoice draft.
12. Open the A4 print preview page.
13. Record a manual payment through billing.
14. Show outstanding amount updates in billing.
15. Open `/admin/hardware/demo` and show the offline queue panel.

## Known Demo Boundaries

- Payment gateways are contract-only and not connected.
- Production database is never used.
- Local credentials are generated into `.env.demo.local` and are not committed.
