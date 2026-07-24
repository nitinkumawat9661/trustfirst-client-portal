# Mangalam Data Classification

| Classification | Meaning |
| --- | --- |
| `LOCKED_REQUIREMENT` | Confirmed behavior or authoritative identity |
| `OBSERVED_REFERENCE` | Evidence from a protected business document |
| `WAITING_FOR_CLIENT` | Requires current client data or an explicit decision |
| `NOT_YET_IMPORTED` | Deliberately absent from operational tables |
| `SOURCE_VARIATION_REVIEW_ONLY` | Conflicts with a higher-priority source and cannot update identity |
| `SUPERSEDED_DEMO_CONFIGURATION` | Historical placeholder with no production authority |

## Current Status

- Official identity, GST registration identity, and branding: `LOCKED_REQUIREMENT`
- Purchase workflow: `LOCKED_FROM_REAL_REFERENCES`
- Line discounts, multiple HSN support, CGST/SGST, IGST capability, round-off, supplier ledger, A4, and multi-page print: `LOCKED_REQUIREMENT`
- Product master: `WAITING_FOR_CLIENT / PROGRESSIVE`
- Actual HSN master: `WAITING_FOR_VERIFICATION`
- Opening stock, actual suppliers, actual balances, sale prices, and current purchase rates: `WAITING_FOR_CLIENT`
- Source products, quantities, prices, discounts, and balances: `OBSERVED_REFERENCE`, `NOT_YET_IMPORTED`
