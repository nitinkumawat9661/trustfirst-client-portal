# Mangalam Missing Details And Follow-Up

Source requirement: `PUB-REQ-2026-0015`.

Do not ask the client again for the selected categories, units, payment modes, Owner/Manager roles, bilingual preference, or selected reports.

## Blocking Before Development

1. Confirm the final business spelling: `Mangalam Sanitary`, `Manglam Sanitary`, or another registered name.
2. Confirm whether prices are GST-inclusive or GST-exclusive.
3. Confirm intra-state versus inter-state sales and the required CGST/SGST/IGST behavior.
4. Confirm whether HSN/SAC is required on every product and print.
5. Confirm invoice and quotation prefix, sequence reset, financial year, and whether old numbers must continue.
6. Define discounts: fixed or percentage, item or bill level, maximum Manager discount, and Owner override.
7. Define sale return, purchase return, cancellation, void, and stock/payment reversal rules.
8. Define supplier payments: partial settlement, advance payment, due dates, and bill allocation.
9. Define customer credit: credit limit, due days, opening outstanding, and reminder behavior.
10. Define Owner versus Manager permissions, especially price edits, stock adjustments, discounts, voids, payments, reports, and settings.
11. Confirm whether `offline needed` means responsive phone use, browser PWA operation during internet loss, or both.
12. Confirm the exact demo and target go-live date.

## Blocking Before Client Data Migration

1. Product master with product name, category, brand, unit, SKU, purchase cost, sale price, GST rate, HSN if required, low-stock threshold, and opening quantity.
2. Category hierarchy and brand list.
3. SKU or item-code format and duplicate handling rule.
4. Opening-stock date, quantities, valuation cost, and stock location.
5. Supplier master with contact and opening payable balance.
6. Customer master with contact, credit terms, credit limit, and opening receivable balance.
7. Existing invoice, customer outstanding, supplier outstanding, and advance-payment balances that must carry forward.
8. Confirmed default stock location; the intake godown field was blank.
9. Validated GSTIN, registered address, business contact, and financial year.

## Can Be Decided Later

- Barcode adoption
- Additional roles beyond Owner and Manager
- Advanced dashboard customization beyond core V1 cards
- Native mobile application
- Live payment gateway
- WhatsApp integration
- Advanced notification scheduling
- Final logo refinements after a usable logo file is received
- Additional reports beyond the seven selected reports

## Requested Files

- Product and opening-stock Excel
- Supplier list with opening outstanding
- Customer and customer-outstanding list
- Current sample invoice, quotation, purchase bill, and return note
- Business logo
- Approved terms/footer text

## Concise WhatsApp Message

Hello, we have safely received your requirement as `PUB-REQ-2026-0015` and have not used any test submission. Your requested categories, units, payment modes, reports, Owner/Manager access, Hindi/English preference, stock, purchase, billing, GST, outstanding, print, and offline needs are already noted.

To finalize the real setup, please send: (1) product/opening-stock Excel with SKU, brand, unit, purchase price, sale price, GST rate and HSN if used; (2) supplier list and outstanding; (3) customer list, credit terms and outstanding; (4) logo plus one current invoice/quotation/purchase bill sample; and (5) preferred invoice/quotation prefixes. Please also confirm GST-inclusive or exclusive pricing, CGST/SGST/IGST rules, discount limits, return/cancellation rules, Owner versus Manager permissions, whether offline use is needed on phone/PWA, and your target demo date.
