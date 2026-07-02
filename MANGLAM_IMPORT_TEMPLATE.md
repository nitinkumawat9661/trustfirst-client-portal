# Manglam Import Template

## Product Import Columns

| Column | Required | Example | Validation |
| --- | --- | --- | --- |
| SKU | Yes | `PVC-PIPE-001` | Unique per tenant. |
| Product name | Yes | `PVC Pipe 1 inch` | Required display name. |
| Category | Yes | `Pipes` | Must map to a category. |
| Brand | No | `GenericFlow` | Optional brand label. |
| Unit | Yes | `PCS` | Must map to a unit code. |
| Barcode | No | `890000000101` | Unique when present. |
| Sale price | Yes | `145.00` | Non-negative currency amount. |
| Purchase cost | Yes | `110.00` | Non-negative currency amount. |
| GST rate | Yes | `18` | Valid percentage rate. |
| Opening stock | Yes | `40` | Non-negative integer quantity. |
| Low stock threshold | Yes | `5` | Non-negative integer threshold. |
| Stock location | Yes | `Main Godown` | Must resolve to a tenant stock location. |

## Import Behavior

- Duplicate SKU handling is explicit and must not silently overwrite unrelated products.
- Duplicate barcode handling rejects or skips rows according to import mode.
- Invalid rows are rejected and included in the import summary.
- Successful rows are tenant-scoped and may create opening stock movements.
