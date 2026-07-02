# Hardware Demo QA

## Demo Checklist

Use `/admin/hardware/demo` before a client walkthrough. The page verifies:

- Hardware business settings.
- Default stock location.
- Product availability.
- Customer or supplier availability.
- Print readiness.
- Offline readiness.
- Existing demo documents.

## Demo Controls

The page exposes safe demo controls:

- Seed generic hardware and sanitary demo data.
- Reset only the generic demo sample set.
- Confirm before reset.

No firm-specific names are hardcoded in the demo controls or seed data.

## QA Flow

1. Configure hardware settings.
2. Seed demo data.
3. Confirm checklist readiness.
4. Create or open a product with SKU and barcode.
5. Add stock movement.
6. Create a customer.
7. Create a quotation.
8. Convert quotation to sale.
9. Confirm sale and verify stock deduction.
10. Open print preview.
11. Record manual payment.
12. Check pending/outstanding amount.
13. Toggle offline mode and verify queued draft UI.

## Validation Coverage

The hardening suite checks duplicate SKU/barcode prevention, invalid GST rejection, negative stock prevention, invalid payment amount prevention, tenant-scoped links, print projection, billing payment behavior, inventory movement behavior, and offline queue behavior.
