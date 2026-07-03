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

The thank-you page appears only after the server saves the intake in the database. It shows:

- Submission ID
- submitted date/time
- business name
- `Your details have been received by TrustFirst.`
- `Please send this Submission ID to TrustFirst on WhatsApp.`

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

The admin queue shows the same Submission ID, submitted time, business name, owner/mobile summary, status, source `public-intake`, and client slug `manglam-trading-demo`.

## Demo Script

1. Open the public intake link and confirm the form title is visible.
2. Fill the required firm, business, catalog, payment, report, and pain-point fields.
3. Submit the form.
4. Confirm the thank-you page shows a public Submission ID, submitted time, and business name.
5. Ask the client to send the Submission ID to TrustFirst on WhatsApp.
6. Open `/admin/requirements/intake` as an authenticated TrustFirst admin.
7. Verify the same Submission ID appears in the protected queue.
8. Mark the item reviewed.
9. Confirm anonymous browser access to `/admin`, `/client`, and protected APIs is blocked.
10. Run `SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke` after deployment.

## Smoke Debug

If the smoke test reports a missing thank-you marker, check `PUBLIC_INTAKE_SMOKE_DEBUG.md`. The Sprint 39C investigation found that the API could create a Submission ID while the live runtime still served an older thank-you build. The fix is to redeploy with the hardened VPS deploy script and confirm the deployed commit hash.

Latest staging verification passed with Submission ID `PUB-REQ-2026-0010`; the thank-you page showed the submitted business name and the protected admin queue verified the same ID.

## Limitations

- This is an intake foundation, not a public portal.
- Public users cannot upload files in this intake path.
- Public users cannot edit a submitted requirement after final submit.
- A failed backend save shows an error state instead of a thank-you page.
- Final production client usage still requires HTTPS/domain setup.
