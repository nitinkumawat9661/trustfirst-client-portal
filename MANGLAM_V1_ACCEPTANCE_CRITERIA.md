# Mangalam Sanitary V1 Acceptance Criteria

Source requirement: `PUB-REQ-2026-0015`.

These criteria translate the broad client answers into a proposed measurable V1. The client must approve any criterion that depends on an unresolved business rule.

## Business And Access

1. The tenant shows the approved firm identity, GSTIN, address, contact, financial year, logo, and print footer.
2. Only the two approved Owner and Manager users can access the tenant.
3. Owner and Manager permissions match the approved matrix and are enforced server-side.
4. Anonymous users cannot access admin, hardware, billing, customer, supplier, report, or settings data.

## Catalog

5. Approved categories, brands, units, and products can be created and found by name or SKU.
6. Duplicate SKU is rejected within the tenant.
7. Barcode remains optional and does not block product creation or billing.
8. Product import provides preview, row-level validation, duplicate handling, execution summary, and reconciliation.

## Inventory

9. Approved opening stock is imported once into the approved stock location.
10. Current stock matches the signed client opening-stock file.
11. Confirmed purchase stock increases inventory.
12. Confirmed sale stock decreases inventory.
13. Negative stock is blocked.
14. Adjustments and approved returns create auditable reversing movements.
15. Low-stock products are calculated from approved thresholds.

## Suppliers And Purchases

16. Suppliers can be maintained with approved contact, GST, terms, and opening balances.
17. Purchase orders do not change stock.
18. Confirmed purchase entries add stock exactly once.
19. Supplier bills and approved settlements produce a correct outstanding balance.
20. Purchase returns reverse stock and outstanding according to the approved policy.

## Customers, Sales, And Billing

21. Customers can be maintained with approved credit terms and opening balances.
22. A quotation can be created from catalog items without changing stock.
23. A quotation can be converted to a sale without duplicate items or totals.
24. Confirming the sale deducts stock exactly once.
25. An invoice draft can be created and issued using the approved numbering policy.
26. Partial and full manual payments update customer outstanding correctly.
27. Sale returns and cancellations follow the approved stock, invoice, and payment reversal rules.

## Tax, Discounts, And Printing

28. GST is calculated using approved inclusive/exclusive, HSN, and CGST/SGST/IGST rules.
29. Discounts obey approved item/bill, fixed/percentage, and role-limit rules.
30. Round-off obeys the approved tenant setting.
31. A4 quotation and invoice print show approved firm/customer details, number/date, items, GST summary, discounts, round-off, totals in words, terms, and signature.
32. Printed totals match persisted document totals.

## Reports

33. Daily sales reconciles to confirmed sales for the selected date.
34. Purchase summary reconciles to approved purchase document statuses.
35. Stock movement shows auditable in, out, adjustment, and return entries.
36. Low-stock report matches product thresholds and current stock.
37. Customer outstanding reconciles to invoices, opening balances, and payments.
38. Supplier outstanding reconciles to bills, opening balances, and settlements.
39. GST summary reconciles to approved tax rules and document lines.
40. Approved exports contain the selected filters and columns.

## Language, Mobile, And Offline

41. Agreed hardware workflows are usable at 360px without overlapping controls.
42. Agreed labels and validation messages are available in English and Hindi.
43. Approved offline draft actions are tenant/user scoped, retain order, retry safely, and show failures.
44. A disconnected action never displays final success until server synchronization succeeds.
45. The app recovers safely after network restoration without duplicate stock, invoice, or payment effects.

## Release Gate

V1 is accepted only when:

- all client-approved criteria pass
- migration reconciliation is signed
- tenant isolation and permission tests pass
- print and totals are approved using real but protected sample data
- known limitations are documented
- demo/smoke records remain separate from the real client dataset
