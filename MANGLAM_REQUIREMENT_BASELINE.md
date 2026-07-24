# Mangalam Sanitary Requirement Baseline

## Baseline Rules

Authoritative source: `PUB-REQ-2026-0015`.

This baseline records capability intent separately from operational detail. `NEEDED`, `YES NEEDED`, and `EVERYTHING THAT EXISTS` confirm interest only; they do not define complete behavior.

Classification totals:

- Confirmed: 42
- Needs clarification: 14
- Not requested: 2
- Future or optional: 0

## Classified Baseline

| ID | Requirement or fact | Classification | Baseline decision |
| --- | --- | --- | --- |
| MRG-001 | Firm identity | CONFIRMED | Use the submitted business name only after spelling approval. |
| MRG-002 | Contact details | CONFIRMED | Contact, phone, and email were provided and remain protected. |
| MRG-003 | Business address | CONFIRMED | Address was provided; validate before configuration. |
| MRG-004 | GST registration identifier | CONFIRMED | GSTIN was provided; validate format and registration state. |
| MRG-005 | Hardware and sanitary trading | CONFIRMED | Primary business type. |
| MRG-006 | One counter or branch | CONFIRMED | Initial operating count is one. |
| MRG-007 | Two users | CONFIRMED | Initial team size is two. |
| MRG-008 | Godown and stock-location topology | NEEDS CLARIFICATION | Godown answer was blank. |
| MRG-009 | Eight selected product categories | CONFIRMED | Pipes, fittings, taps, valves, bathroom accessories, sanitary ware, fasteners, and electrical hardware. |
| MRG-010 | Five selected units | CONFIRMED | Piece, box, set, pair, and bundle. |
| MRG-011 | Multi-brand catalog | CONFIRMED | Products must support brands. |
| MRG-012 | SKU or item codes | CONFIRMED | SKU capability is required. |
| MRG-013 | Barcode operation | NOT REQUESTED | Client stated no barcode use. |
| MRG-014 | Product master structure | NEEDS CLARIFICATION | Product names, variants, brand/category hierarchy, and code rules are missing. |
| MRG-015 | Opening-stock capability | CONFIRMED | Required for go-live setup. |
| MRG-016 | Opening-stock dataset and valuation | NEEDS CLARIFICATION | Quantities, rates, date, and location are missing. |
| MRG-017 | Stock tracking | CONFIRMED | Required at capability level. |
| MRG-018 | Low-stock alerts | CONFIRMED | Required at capability level. |
| MRG-019 | Stock adjustments | CONFIRMED | Required at capability level. |
| MRG-020 | Location-specific stock rules | NEEDS CLARIFICATION | Default location and transfer behavior are unknown. |
| MRG-021 | Supplier management | CONFIRMED | Required at capability level. |
| MRG-022 | Purchase entry | CONFIRMED | Required at capability level. |
| MRG-023 | Supplier bill lifecycle | NEEDS CLARIFICATION | Bill entry, due date, partial settlement, and cancellation rules are missing. |
| MRG-024 | Supplier outstanding | CONFIRMED | Required at capability level. |
| MRG-025 | Customer management | CONFIRMED | Required by billing and outstanding workflows. |
| MRG-026 | Customer outstanding | CONFIRMED | Required at capability level. |
| MRG-027 | Customer credit and reminders | NEEDS CLARIFICATION | Credit limit, terms, due dates, and reminder channels are missing. |
| MRG-028 | Sales quotation | CONFIRMED | Required at capability level. |
| MRG-029 | Sales and billing flow | CONFIRMED | Required at capability level. |
| MRG-030 | Invoice lifecycle and content | NEEDS CLARIFICATION | Issue, edit, void, number, and required fields are missing. |
| MRG-031 | GST billing | CONFIRMED | Required at capability level. |
| MRG-032 | Discounts | CONFIRMED | Required at capability level. |
| MRG-033 | Six payment modes | CONFIRMED | Cash, UPI, bank transfer, cheque, card, and other. |
| MRG-034 | A4 print | CONFIRMED | Required at capability level. |
| MRG-035 | Sale or purchase returns | CONFIRMED | Broad need follows the stock adjustment and return answer. |
| MRG-036 | Cancellation and reversal policy | NEEDS CLARIFICATION | Not described. |
| MRG-037 | Daily sales report | CONFIRMED | Selected. |
| MRG-038 | Purchase summary report | CONFIRMED | Selected. |
| MRG-039 | Stock movement report | CONFIRMED | Selected. |
| MRG-040 | Low-stock report | CONFIRMED | Selected. |
| MRG-041 | Customer outstanding report | CONFIRMED | Selected. |
| MRG-042 | Supplier outstanding report | CONFIRMED | Selected. |
| MRG-043 | GST summary report | CONFIRMED | Selected. |
| MRG-044 | Report export | CONFIRMED | Required at capability level. |
| MRG-045 | Export formats and columns | NEEDS CLARIFICATION | Excel, CSV, PDF, filters, and columns are unspecified. |
| MRG-046 | Dashboard contents | NEEDS CLARIFICATION | `EVERYTHING THAT EXISTS` is not an accepted scope definition. |
| MRG-047 | Owner role | CONFIRMED | Selected. |
| MRG-048 | Manager role | CONFIRMED | Selected. |
| MRG-049 | Additional roles | NOT REQUESTED | No other role was selected. |
| MRG-050 | Owner and Manager permissions | NEEDS CLARIFICATION | Access and approval boundaries are unspecified. |
| MRG-051 | English and Hindi | CONFIRMED | Both languages were selected. |
| MRG-052 | Offline capability | CONFIRMED | Broad need confirmed. |
| MRG-053 | Mobile behavior | NEEDS CLARIFICATION | Native app versus responsive PWA was not distinguished. |
| MRG-054 | Current offline/manual workflow | CONFIRMED | Existing work is described as entirely offline. |
| MRG-055 | Accuracy and quality priority | CONFIRMED | High-level quality expectation. |
| MRG-056 | Measurable success criteria | NEEDS CLARIFICATION | Client answered `DONT KNOW YET`. |
| MRG-057 | Earliest feasible delivery | CONFIRMED | Urgency is high. |
| MRG-058 | Calendar demo or go-live date | NEEDS CLARIFICATION | No exact date was supplied. |

## Change Control

This baseline is frozen for V1 planning. A change requires:

1. Client confirmation referencing the affected baseline ID.
2. Classification update in this document.
3. Impact review for data, development, QA, and delivery.
4. Explicit approval before adding the change to a sprint.
