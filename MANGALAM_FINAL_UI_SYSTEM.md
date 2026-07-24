# Mangalam Final UI System

## Production Identity

- Product entry: `https://mangalamsanitary.in`
- Workspace: Mangalam Sanitary ERP
- Technical tenant slug: `manglam-trading-demo`
- Approved visual identity: locked black/gold Mangalam Sanitary logo
- Legal and GST identity: read from locked tenant configuration
- UI direction: charcoal navigation, warm-gold actions, neutral operational workspace

The production UI uses actual application routes and tenant-scoped services. There is no separate preview interface.

## Navigation

The sidebar is permission-filtered and exposes:

1. Dashboard
2. Products
3. Inventory
4. Purchases
5. Sales / Billing
6. Quotations
7. Suppliers
8. Customers
9. Outstanding
10. Reports
11. Settings

The shell includes mobile navigation, breadcrumbs, `Ctrl+K` module navigation, notification and user menus, theme switching, and the existing offline queue status.

## Data Truth Rules

- Dashboard values come only from persisted tenant records.
- Confirmed documents alone contribute to sales and purchase totals.
- Business-day totals use the `Asia/Kolkata` day boundary.
- Product, party, stock, invoice, and balance views show empty states when records do not exist.
- The retained public intake submission is not classified as a customer or supplier and cannot be linked to a trade document.
- Reference invoices never create products, stock, parties, balances, or transactions.
- Demo seed and reset controls are disabled for a tenant whose official identity is locked.
- Missing master data appears as `Pending`, `Not provided`, `Needs review`, or `WAITING FOR CLIENT CONFIRMATION`.

## Operational Screens

### Products

The real product form and list support SKU, barcode, category, brand, unit, HSN/SAC, GST, purchase price, sale price, low-stock threshold, current stock, and status. SKU, barcode, GST, tenant-link, and input validation remain server enforced.

### Inventory

Inventory supports stock inward, stock outward, absolute stock adjustment, locations/godowns, negative stock prevention, an immutable movement ledger, and explicit confirmation for stock-reducing actions. An adjustment can intentionally set stock to zero.

### Purchasing

Purchase entry, supplier bill, and purchase order forms support multiple lines, supplier references, HSN/SAC, unit, line discount, GST, intra-state or inter-state treatment, round-off, and totals. Supplier references are checked for obvious duplicates within the same tenant and supplier.

### Sales And Quotations

Sales and quotation forms use the persisted catalog and explicit customer records. Barcode lookup, keyboard-friendly line entry, payment mode, discounts, GST, round-off, quotation finalization, quotation-to-sale conversion, stock confirmation, invoice draft creation, and print preview use existing tenant-aware services.

Quotation conversion preserves line metadata and records the source quotation. A quotation cannot be converted twice, and an invoice draft cannot be created before sale confirmation.

### Parties And Outstanding

Customers and suppliers must be explicitly classified. The UI records contact, GSTIN, address, and opening balance. Customer balances use payable invoice states; supplier balances use confirmed supplier bills only. Purchase orders and reference documents do not create outstanding balances.

### Reports And Settings

Reports display saved sales, purchases, stock movement, low stock, customer/supplier outstanding, and GST totals. Settings display locked official identity separately from client-controlled commercial values still awaiting confirmation.

## Print System

The A4 print route uses the approved logo, official tenant identity, party details, reference fields, HSN, quantity, unit, rate, line discount, taxable value, CGST/SGST or IGST, round-off, total, Indian amount-in-words, terms, and authorised-signature area.

Print CSS uses A4 portrait dimensions, repeating table headers, page-break avoidance for line rows and totals, and browser print controls. Supplier branding and historical reference values are never copied into Mangalam output.

## Responsive And Accessibility

- Mobile-first shell and forms support a 360px viewport.
- Wide operational tables use explicit horizontal scrolling instead of clipping.
- Interactive controls use semantic buttons, links, labels, fieldsets, focus rings, and named icon buttons.
- Dialogs expose dialog semantics and support Escape dismissal.
- Destructive stock/document actions require confirmation.
- Loading and route error boundaries are present.
- Motion is restrained and respects reduced-motion styles.

## Security

- Secure Auth.js cookies are mandatory in production.
- Temporary HTTP staging login and auth-bypass code has been removed.
- State-changing APIs enforce same-origin CSRF checks and Zod validation.
- Route handlers resolve the authenticated tenant server side.
- Trade links validate tenant ownership and explicit customer/supplier classification.
- The public branding endpoint serves only the locked approved logo path and whitelisted image MIME types.
- Private GST certificates and source invoices are not publicly routable.

## Deliberate Empty Production State

After the approved cleanup, the production tenant has no products, stock movements, parties, commercial documents, invoices, or payments. This is intentional. Real master data must pass preview and client reconciliation before import.
