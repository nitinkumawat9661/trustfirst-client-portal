# Public Intake Security Note

## Scope

The public Manglam requirement intake is intentionally limited to:

```text
/intake/manglam-trading-demo
/intake/manglam-trading-demo/thank-you
/api/public/intake/manglam-trading-demo
```

The intake flow is write-only for public users. It returns only a public submission number and never exposes submitted requirement details.

## Protected Routes

The following route groups must remain unavailable to anonymous public visitors:

- `/admin/*`
- `/client/*`
- `/master/*`
- `/api/admin/*`
- `/api/client/*`
- `/api/master/*`
- `/api/requirements/*`
- `/api/crm/*`
- `/api/projects/*`
- `/api/tenants/*`

Sprint 37 tightened the temporary HTTP staging auth bypass so it only activates when the request includes:

```text
x-trustfirst-internal-qa: yes
```

The existing environment and host gates still apply. A normal browser request to the staging IP cannot unlock admin or client routes.

## Data Handling

Public intake submissions are stored as existing `Requirement` records under tenant slug `manglam-trading-demo` and client slug `manglam-trading-demo`.

Stored metadata includes:

- `source: public-intake`
- public submission number
- review status
- hashed IP address when available
- truncated user agent when available

No secrets, passwords, or private deployment values are stored in the intake payload.

## Admin Review

Admins review public submissions at:

```text
/admin/requirements/intake
```

This route uses normal server-side `requireCurrentUser()` enforcement and is not public.

## Temporary HTTP Staging

The public intake can be used over:

```text
http://45.10.21.141:3010/intake/manglam-trading-demo
```

until a proper HTTPS demo domain is configured. The HTTPS domain remains required before production client usage.

## Sprint 38 Loading Fix

The public intake page no longer depends on the root streaming loading fallback or client-side hydration to show the form. It now renders a native server-side form and posts directly to the public intake API.

This keeps anonymous access limited to the public intake route and submit endpoint while preventing the browser from staying on a spinner if inline streaming reveal scripts are blocked by CSP.
