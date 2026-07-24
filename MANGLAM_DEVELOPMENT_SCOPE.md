# Mangalam Sanitary V1 Development Scope

## Scope Authority

This V1 is frozen from `PUB-REQ-2026-0015` and the classifications in `MANGLAM_REQUIREMENT_BASELINE.md`.

The objective is a reliable two-user hardware and sanitary shop workflow. Unrelated TrustFirst SaaS modules are outside this client scope.

## V1 In Scope

### 1. Business Profile

- Firm identity, protected contact data, address, and validated GSTIN
- Financial year
- One default operating location
- Invoice and quotation prefixes after client approval
- Round-off, GST mode, print footer, terms, logo, and signature settings

### 2. Catalog

- Categories, brands, units, products, and SKUs
- Selected categories and units from the submission
- Purchase cost, sale price, low-stock threshold, and per-item tax configuration
- Product import with validation and client-approved duplicate rules
- Barcode field retained but not required or shown as an operational dependency

### 3. Inventory

- Opening-stock import into a confirmed stock location
- Stock in, stock out, stock adjustment, and return reversal
- Negative-stock prevention
- Current stock, stock value, movement history, and low-stock list

### 4. Suppliers And Purchases

- Supplier master
- Purchase order, purchase entry, and supplier bill flow
- Supplier invoice references, multi-line entry, per-line discounts, HSN review, CGST/SGST/IGST, round-off, and multi-page support
- Stock addition only on confirmed stock-affecting purchase
- Supplier outstanding and settlement behavior after clarification
- Purchase return and stock reversal

### 5. Customers And Sales

- Customer master and protected contact details
- Credit terms and outstanding after clarification
- Quotation, quotation-to-sale conversion, confirmed sale, and stock deduction
- Invoice draft and manual payment recording
- Sale return and reversal

### 6. Tax, Discount, And Payment

- Client-approved GST mode and item rates
- CGST/SGST/IGST and per-line HSN capability; actual master classifications remain verification-gated
- Per-line purchase discount plus separate bill-level discount, with tenant-defined authorization rules
- Cash, UPI, bank transfer, cheque, card, and other manual payment modes
- Partial payment and outstanding calculation
- No live payment gateway

### 7. Print And Reports

- Browser A4 invoice and quotation print with continuation-page support
- Firm/customer details, item table, GST summary, discount, round-off, totals in words, terms, and signature
- Daily sales, purchase summary, stock movement, low stock, customer outstanding, supplier outstanding, and GST summary
- Client-approved CSV/Excel/PDF export behavior

### 8. Access, Language, And Offline

- Owner and Manager roles only
- Server-side tenant and permission enforcement
- Responsive mobile-safe screens
- English and Hindi labels to the agreed depth
- Existing PWA/offline queue for supported draft actions, hardened only to the agreed V1 behavior

## V1 Exclusions

- Native mobile application
- Live payment gateway
- Full accounting ledger, trial balance, profit and loss, or balance sheet
- Inventory manufacturing or bill of materials
- Multi-company consolidation
- E-commerce integration
- WhatsApp live integration
- Barcode hardware workflow
- Additional roles beyond Owner and Manager
- Generic CRM, project, requirement, approval, or document features not used by this shop flow
- Dashboard widgets described only as `everything`

## Development Gates

Production behavior must not be implemented until the corresponding blocking rules in `MANGLAM_MISSING_DETAILS_QUESTIONS.md` are answered.

Configuration and data preparation must remain separate:

- Code defines reusable behavior.
- Tenant configuration defines Mangalam-specific choices.
- Protected data import contains real products, customers, suppliers, balances, and stock.
- Demo and smoke records are never promoted into the real client dataset.

## Freeze Decision

V1 scope frozen: yes.

Ready for unrestricted development: no.

Ready for Sprint 43 configuration foundation: yes, limited to verified configuration, protected data separation, and follow-up-driven defaults.
