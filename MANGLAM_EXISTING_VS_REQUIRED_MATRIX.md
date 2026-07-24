# Mangalam Existing Versus Required Matrix

Source requirement: `PUB-REQ-2026-0015`.

Status meanings:

- Existing support: reusable production implementation exists.
- Partial support: foundation exists but does not satisfy the complete client requirement.
- Missing: no adequate implementation was verified.
- Configuration only: no new reusable behavior should be needed after clarification.
- Client data: records or files must come from the client.

| Requirement | Existing support | Partial support | Missing | Configuration only | Client data | Evidence and decision |
| --- | --- | --- | --- | --- | --- | --- |
| Business profile | Yes |  |  | Yes | Yes | Hardware settings persist firm, GSTIN, address, phone, email, financial year, GST mode, round-off, location, logo placeholder, and footer. |
| Categories | Yes |  |  | Yes | Yes | Category repository, service, API, and admin page exist. |
| Brands | Yes |  |  | Yes | Yes | Brand repository, service, API, and admin page exist. |
| Units |  | Yes |  | Yes | Yes | Unit entity and create service exist; complete list/edit administration needs verification or completion. |
| Products and SKU | Yes | Yes |  |  | Yes | Product create/list/search and duplicate SKU protection exist; complete edit/archive workflow is limited. |
| Barcode | Yes |  |  | Yes |  | Optional field and search exist, but client does not require barcode operation in V1. |
| Prices and costs | Yes |  |  |  | Yes | Product purchase cost and sales price fields exist. |
| Product GST rate | Yes | Yes |  | Yes | Yes | Per-item rate basis points exist; HSN and jurisdiction split do not. |
| Product import | Yes | Yes |  |  | Yes | Preview/execution and duplicate handling exist; category/brand/unit mapping and opening-stock movements are incomplete. |
| Opening stock | Yes | Yes |  |  | Yes | Inventory adjustment can establish stock; production import and valuation workflow need development. |
| Stock tracking | Yes | Yes |  | Yes | Yes | Movement ledger, current stock, and negative-stock prevention exist; current summaries aggregate across locations. |
| Low-stock | Yes | Yes |  | Yes | Yes | Threshold and dashboard/report count exist; proactive notification behavior is not complete. |
| Stock adjustment | Yes |  |  | Yes |  | Stock adjustment movement is implemented with audit/timeline behavior. |
| Stock locations | Yes | Yes |  | Yes | Yes | Location model/API exists; multi-location transfer and location-specific summaries are incomplete. |
| Customer master | Yes | Yes |  |  | Yes | Tenant-aware CRM client organization exists; shop-specific customer fields and credit limits need configuration/development. |
| Supplier master | Yes | Yes |  |  | Yes | Trade documents can link suppliers through client organizations; supplier-specific lifecycle and fields are limited. |
| Purchase order | Yes |  |  | Yes |  | Hardware trade type, service, API, and UI route exist. |
| Purchase entry | Yes |  |  | Yes |  | Confirmation adds stock. |
| Supplier bill | Yes | Yes |  |  | Yes | Supplier bill type and outstanding aggregate exist; settlement/partial-payment ledger is incomplete. |
| Purchase return | Yes | Yes |  | Yes |  | Return type and stock direction exist; approval and cancellation policy need clarification. |
| Quotation | Yes | Yes |  |  | Yes | Sales quotation and conversion to sales order exist; editable production workflow and prefix are limited. |
| Sale and stock deduction | Yes |  |  | Yes |  | Confirmed sale deducts stock and prevents negative stock. |
| Sale return | Yes | Yes |  | Yes |  | Return movement exists; client rules and invoice/payment reversal need completion. |
| Invoice draft | Yes | Yes |  |  | Yes | Sale can create linked invoice draft; final hardware invoice lifecycle and numbering need alignment. |
| Manual payments | Yes |  |  | Yes | Yes | Partial/manual payments and six modes exist in Billing. Live providers remain contracts only. |
| Customer outstanding | Yes | Yes |  |  | Yes | Invoice outstanding is calculated; aging, opening balances, and customer credit policy need work/data. |
| Supplier outstanding |  | Yes | Yes |  | Yes | Report totals unpaid supplier bills, but payment allocation and partial settlement are missing. |
| GST calculation | Yes | Yes | Yes |  | Yes | Per-line flat tax and GST print summary exist; inclusive pricing, HSN, place of supply, CGST/SGST/IGST are missing. |
| Discounts | Yes | Yes |  |  |  | Fixed item-level discount exists; percentage, document-level, and authorization rules are missing. |
| Round-off | Yes | Yes |  | Yes |  | Trade total supports round-off; settings flag is not a full enforced policy. |
| Document numbering | Yes | Yes |  | Yes |  | Unique hardcoded prefixes exist; tenant-configured invoice/quotation sequences are incomplete. |
| A4 printing | Yes | Yes |  | Yes | Yes | Browser print projection includes firm/customer/items/GST/totals/footer/signature; final layout and real PDF generation need approval/completion. |
| Core reports | Yes | Yes |  |  | Yes | Seven headline metrics are represented; detailed rows, filters, periods, and reconciliation need work. |
| Export | Yes | Yes |  |  | Yes | Product and invoice CSV contracts exist; report-specific Excel/PDF export is incomplete. |
| Owner dashboard | Yes | Yes |  | Yes |  | Operational cards exist; `everything` is rejected as scope and the final card set needs approval. |
| Owner/Manager permissions | Yes | Yes |  | Yes |  | Tenant roles, permission resolver, cache, and policy enforcement exist; exact role grants need configuration. |
| English/Hindi | Yes | Yes |  | Yes |  | A bilingual hardware label contract exists; full screen and validation translation is incomplete. |
| Responsive mobile | Yes | Yes |  |  |  | Mobile-first pages exist; client-device QA is still required. |
| Offline queue/PWA | Yes | Yes |  | Yes |  | PWA and scoped queue support six draft actions; server idempotency/conflict depth and full offline workflow are incomplete. |

## Reusable Foundation

The following should be reused rather than rewritten:

- Tenant isolation and permission enforcement
- Hardware product/category/brand/unit/location models
- Product search, SKU/barcode validation, and import validation
- Inventory movement ledger and negative-stock prevention
- Sales, purchase, quotation, supplier bill, and return document types
- Quotation-to-sale conversion and stock movement confirmation
- Billing invoices, manual partial payments, and customer outstanding
- A4 print projection and browser print route
- Core dashboard/report calculations
- English/Hindi label contract
- PWA and tenant/user-scoped offline queue

## Development Gaps

Priority gaps are tax jurisdiction/HSN behavior, opening-stock migration, supplier payment settlement, configurable numbering, robust discount policy, detailed report/export behavior, product/master maintenance, full bilingual coverage, and agreed offline conflict/idempotency behavior.
