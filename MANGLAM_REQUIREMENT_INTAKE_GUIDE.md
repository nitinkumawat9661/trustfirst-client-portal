# Manglam Requirement Intake Guide

## Public Link

Use this temporary staging link for the requirement intake:

```text
http://45.10.21.141:3010/intake/manglam-trading-demo
```

After HTTPS domain setup, replace the host with the configured TrustFirst demo domain.

## What The Form Collects

The intake form captures ten sections:

1. Contact and firm details
2. Business profile
3. Product catalog
4. Stock and godown
5. Sales and billing
6. Purchase and suppliers
7. Payments and outstanding
8. Reports and dashboard
9. Users, language, offline
10. Current issues and demo success criteria

The form autosaves a local browser draft. Draft data stays on the submitter device until final submission.

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

1. Open the public intake link.
2. Fill the required firm, business, catalog, payment, report, and pain-point fields.
3. Submit the form.
4. Confirm the thank-you page shows a public submission number.
5. Open `/admin/requirements/intake` as an authenticated TrustFirst admin.
6. Verify the new submission appears in the protected queue.
7. Mark the item reviewed.
8. Confirm anonymous browser access to `/admin`, `/client`, and protected APIs is blocked.

## Limitations

- This is an intake foundation, not a public portal.
- Public users cannot upload files in this Sprint 37 path.
- Public users cannot edit a submitted requirement after final submit.
- Final production client usage still requires HTTPS/domain setup.
