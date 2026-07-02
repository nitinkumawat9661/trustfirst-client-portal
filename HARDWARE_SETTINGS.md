# Hardware Settings

## Purpose

Hardware business settings provide the tenant-level identity and defaults needed for real showroom, godown, quotation, and invoice workflows.

## Settings

- Firm name
- GSTIN
- Address
- Phone
- Email
- Logo placeholder
- Invoice prefix
- Financial year
- Default GST mode
- Round-off setting
- Default stock location
- Terms and footer text

## Data Ownership

Settings are stored per tenant in `HardwareBusinessSettings`. The default stock location is optional and references `HardwareStockLocation` with `ON DELETE SET NULL` so deleting a location does not remove business settings.

## Validation

The service validates that any selected default stock location belongs to the same tenant. Settings writes require hardware settings management permission, while reads require settings read permission or plugin management access.

## Localization

Hardware UI labels are exposed through a Hindi and English label contract. Components should consume labels through the contract instead of embedding module business labels directly.

## Demo Usage

For a demo, configure the tenant with a generic firm profile, seed generic products and stock, then use the quotation-to-sale-to-print flow. No firm name is hardcoded in the module.
