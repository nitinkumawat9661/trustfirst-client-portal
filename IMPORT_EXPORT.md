# Import And Export

The CRM import/export layer provides production contracts without introducing external storage or document rendering integrations.

## CSV Import

`POST /api/crm/import/preview` accepts CSV text and returns a preview:

- normalized row values
- row number
- validation issues
- valid row count
- invalid row count

The preview step must pass before a future import execution endpoint writes client records.

## CSV Export

`GET /api/crm/export?format=csv&scope=clients` returns an export plan with file name, content type, format, and scope. CSV generation can be attached without changing the contract.

## PDF Export

`GET /api/crm/export?format=pdf&scope=client&clientId=...` returns a PDF export contract. Rendering providers can implement this plan later through the universal document engine.

## Security

Import and export routes are authenticated and tenant scoped. Execution remains in services so validation, permission checks, and audit/event recording can be centralized.

