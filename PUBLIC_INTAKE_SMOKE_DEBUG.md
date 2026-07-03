# Public Intake Smoke Debug

## Sprint 39C Finding

- Date: 2026-07-03
- Base URL: `http://45.10.21.141:3010`
- Public intake route: `/intake/manglam-trading-demo`
- Smoke command: `SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke`
- Result before fix: failed
- Failure: thank-you page missing marker `Manglam Intake Smoke <timestamp>`

## What The Smoke Submits

The smoke script posts JSON to:

```text
/api/public/intake/manglam-trading-demo
```

The submitted payload includes a unique `company.firmName` value in the form:

```text
Manglam Intake Smoke <ISO timestamp>
```

The API returns a public submission number such as:

```text
PUB-REQ-2026-0008
```

## What The Smoke Checks

After submit, the smoke script opens:

```text
/intake/manglam-trading-demo/thank-you?submission=<Submission ID>
```

It verifies:

- the same Submission ID appears
- the submitted business name appears
- `Your details have been received by TrustFirst.` appears
- `Please send this Submission ID to TrustFirst on WhatsApp.` appears
- `/admin/requirements/intake` can find the same Submission ID through the internal QA header
- public read/list access to the intake API is blocked
- admin/client/master routes remain blocked for anonymous public traffic

## Root Cause

The VPS app directory contained the Sprint 39 source code, including the receipt-loading thank-you page, but the running built Next.js output still rendered the older thank-you page. The live HTML showed:

```text
Your requirement intake has been saved for TrustFirst admin review.
Submission number
This public page cannot view submitted details.
```

It did not show the saved business name or the Sprint 39 receipt copy. This means the source archive had reached the VPS, but the active build/runtime had not picked up the Sprint 39 thank-you implementation.

## Fix

The deploy script now prints explicit deployment step output, writes `.trustfirst-deployed-commit`, rebuilds, restarts only `trustfirst-client-portal`, and reports:

- archive uploaded
- remote extract completed
- `npm ci` completed
- migrations applied
- build completed
- PM2 restart completed
- smoke completed
- deployed commit hash
- CafeLuxe untouched

The intended confirmation contract remains unchanged: the thank-you page is shown only after the backend can load the saved receipt by public Submission ID.
