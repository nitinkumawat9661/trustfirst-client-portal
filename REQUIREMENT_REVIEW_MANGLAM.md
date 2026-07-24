# Mangalam Sanitary Requirement Review

## Authority

This review is based only on the verified real client submission `PUB-REQ-2026-0015`.

- Client slug: `manglam-trading-demo`
- Source: `public-intake`
- Business name: `mangalam sanitary`
- Status: `PENDING`
- Submitted: 24 July 2026, 11:11:55 AM IST
- Receipt event: verified
- Submitted sections: 10 of 10
- Admin queue: verified

Smoke, debug, demo, and QA submissions are excluded. In particular, `PUB-REQ-2026-0016` is not a source for this review.

The original database record was read without modification. Direct contact, address, and tax identifiers are masked in version control; their exact values remain in the protected submission.

## A. Business Details

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Firm name | `mangalam sanitary` | Authoritative client-facing spelling still needs confirmation before final branding. |
| Contact person | Provided; masked in this document | Exact value remains in the protected submission. |
| Phone | Provided; ends in `9050` | Exact value remains in the protected submission. |
| Email | Provided; Gmail address masked | Exact value remains in the protected submission. |
| Role | `admin` | Operational role name needs mapping to Owner or Manager permissions. |
| Address | Provided | Exact value remains in the protected submission. |
| GSTIN | Provided | Format and registration state must be validated before configuration. |
| Business type | `Hardware and sanitary trading` | Confirmed. |
| Counters or branches | `1` | One operating counter or branch is confirmed. |
| Godowns | Blank | Stock-location topology is unresolved. |
| User or team size | `2` | Two initial users are expected. |

## B. Product And Catalog

Selected categories:

- Pipes
- Fittings
- Taps
- Valves
- Bathroom accessories
- Sanitary ware
- Fasteners
- Electrical hardware

Selected units:

- Piece
- Box
- Set
- Pair
- Bundle

Other catalog answers:

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Brand handling | `MULTI BRAND` | Multi-brand products are confirmed. |
| SKU or item code | `YES NEEDED` | SKU capability is confirmed; code format is unresolved. |
| Barcode | `NO BARCODE USES` | Barcode operation is not required in V1. The existing optional field can remain unused. |

## C. Stock

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Opening stock | `YES NEEDED` | Opening-stock setup is required; quantities and valuation are missing. |
| Stock tracking | `NEEDED` | Capability confirmed; location and reservation rules need definition. |
| Low-stock alerts | `NEEDED` | Capability confirmed; thresholds and notification behavior are missing. |
| Stock adjustment and returns | `NEEDED` | Capability confirmed; approval, reason, and reversal rules are missing. |
| Godowns | Blank | A default stock location cannot be finalized yet. |

## D. Suppliers And Customers

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Supplier management | `NEEDED` | Confirmed at capability level. |
| Purchase entries | `NEEDED` | Confirmed at capability level. |
| Supplier bills | Not answered separately | Must be clarified before workflow configuration. |
| Supplier payments and outstanding | `NEEDED` | Confirmed at capability level; settlement rules are missing. |
| Customer management | Implied by billing and outstanding selection | Customer master is required for V1, but fields and credit rules need confirmation. |
| Customer outstanding | `NEEDED` | Confirmed at capability level. |
| Customer credit terms | `NEEDED` | Confirmed broadly; limits, due days, and reminders are unresolved. |

## E. Sales And Billing

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Quotation | `NEEDED` | Confirmed at capability level. |
| Sales or billing flow | `NEEDED` | Confirmed at capability level. |
| GST billing | `NEEDED` | Confirmed; tax behavior is unresolved. |
| Discounts | `NEEDED` | Confirmed; percentage, fixed, line, and document rules are unresolved. |
| Payment modes | Cash, UPI, Bank Transfer, Cheque, Card, Other | All six modes are requested. |
| Invoice requirements | Not specified separately | Invoice content, numbering, and issue behavior need clarification. |
| A4 print | `NEEDED` | Confirmed; layout approval is pending. |
| Returns | Included in the stock adjustment and return answer | Broad need confirmed; sale and purchase return rules are unresolved. |
| Cancellations | Not described | Needs clarification before production workflow design. |

## F. Reports

The client selected:

- Daily sales
- Purchase summary
- Stock movement
- Low stock
- Outstanding customers
- Outstanding suppliers
- GST summary

Additional answers:

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Export | `NEEDED` | Export is confirmed; Excel versus CSV/PDF and report-specific columns are unresolved. |
| Dashboard | `EVERYTHING THAT EXISTS` | Not a complete specification. V1 will use only core operational metrics. |

## G. Users And Access

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Roles selected | Owner, Manager | Both roles are confirmed. |
| Other roles | Not selected | Excluded from V1 unless the client requests them. |
| Submitted contact role | `admin` | Must be mapped to Owner or Manager. |
| Preferred language | Both | English and Hindi are requested. Translation depth needs confirmation. |
| Permissions | Not detailed | Owner and Manager capabilities must be approved before production. |

## H. Offline And Mobile

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Current workflow | `CURRENT -EVERYTHING OFFLINE` | Existing work is manual or offline. |
| Offline or mobile need | `NEEDED` | The combined answer does not distinguish offline browser use from mobile-device use. |
| Native mobile app | Not requested explicitly | Not part of frozen V1. Responsive PWA behavior may satisfy the initial need subject to confirmation. |

## I. Pain Points

- Submitted pain point: `NEEDED ACCURACY AND PERFECTION`.
- This confirms a quality expectation, not measurable acceptance behavior.
- The follow-up must identify current errors, duplicate work, stock mismatches, billing mistakes, and reconciliation pain.

## J. Demo And Urgency

| Field | Submitted value | Interpretation |
| --- | --- | --- |
| Target date | `AS EARLIER AS YOU CAN` | High urgency is confirmed, but no calendar date exists. |
| Success criteria | `DONT KNOW YET` | Acceptance criteria must be proposed by TrustFirst and approved by the client. |
| Demo expectation | Not described beyond broad requested capabilities | Demonstrate the frozen V1 happy path, not every existing platform feature. |

## Review Decision

The submission is sufficient to freeze the broad V1 capability boundary. It is not sufficient to configure production tax, numbering, credit, settlement, migration, return, print, permission, or offline behavior without follow-up.
