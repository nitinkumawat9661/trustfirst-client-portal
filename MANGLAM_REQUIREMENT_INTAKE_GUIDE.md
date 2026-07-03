# Manglam Requirement Intake Guide

## Public Link

Use this temporary staging link for the requirement intake after Sprint 38 deployment:

```text
http://45.10.21.141:3010/intake/manglam-trading-demo
```

After HTTPS domain setup, replace the host with the configured TrustFirst demo domain.

## Browser Loading

Sprint 38 fixed a browser-only stuck-loading issue by rendering the form as native server HTML. The page should show `Manglam Trading Company Software Requirement Form` directly, without login and without a spinner-only screen.

## What The Form Collects

The intake form captures:

1. Business Details
2. Product/Catalog Details
3. Stock Details
4. Supplier/Customer Details
5. Billing Details
6. Reports, Access And Demo Success

The public page submits natively to TrustFirst. Public users cannot list or read submissions.

## Submission Result

After submit, the public user sees only a submission number such as:

```text
PUB-REQ-2026-0001
```

Public users cannot view or list submissions.

## Admin Review

TrustFirst admins review submissions here:

```text
/admin/requirements/intake
```

Each item is stored in the existing Requirement Engine with:

- status: `PENDING`
- priority: `HIGH`
- source: `public-intake`
- client slug: `manglam-trading-demo`
- status label: `New Requirement Submitted`

Admins can mark a submission as reviewed. Conversion into deeper business workflows remains an authenticated admin action.

## Demo Script

1. Open the public intake link and confirm the form title is visible.
2. Fill the required firm, business, catalog, payment, report, and pain-point fields.
3. Submit the form.
4. Confirm the thank-you page shows a public submission number.
5. Open `/admin/requirements/intake` as an authenticated TrustFirst admin.
6. Verify the new submission appears in the protected queue.
7. Mark the item reviewed.
8. Confirm anonymous browser access to `/admin`, `/client`, and protected APIs is blocked.
9. Run `SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke` after deployment.

## Limitations

- This is an intake foundation, not a public portal.
- Public users cannot upload files in this intake path.
- Public users cannot edit a submitted requirement after final submit.
- Final production client usage still requires HTTPS/domain setup.
