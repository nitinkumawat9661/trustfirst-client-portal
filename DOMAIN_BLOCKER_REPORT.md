# Domain Blocker Report

## Status

TrustFirst HTTPS demo domain setup is blocked because no domain is configured in `.env.deploy.local`.

## Required DNS

Create this DNS record before rerunning the HTTPS setup:

```text
Type: A
Name: demo.trustfirstsolutions.in
Value: 45.10.21.141
```

After DNS propagation, set the ignored local deploy env value:

```bash
DEPLOY_DOMAIN=demo.trustfirstsolutions.in
```

Do not commit `.env.deploy.local`.

## Sprint 35 Checklist

- Domain configured: no
- DNS resolves to `45.10.21.141`: no, not checked because `DEPLOY_DOMAIN` is empty
- Nginx TrustFirst site created: no
- HTTPS certificate issued: no
- AUTH_URL updated to HTTPS domain: no
- PM2 restarted after AUTH_URL update: no
- HTTPS smoke passed: no
- HTTP staging smoke passed: yes, `http://45.10.21.141:3010`
- HTTP staging login enabled: yes, temporary env-gated workaround
- Login status: passed on HTTP staging after enabling the explicit gate
- Authenticated QA over HTTPS: no
- Manglam full demo QA over HTTPS: no
- Manglam full demo QA over HTTP staging: passed
- CafeLuxe untouched: yes
- Final demo readiness: READY FOR HTTP STAGING QA ONLY

## Current Working URL

```text
http://45.10.21.141:3010
```

This URL remains available for staging QA. It is not the polished final client demo URL because production Auth.js cookies are intentionally secure and should be used behind HTTPS.

Temporary HTTP staging login is documented in `HTTP_STAGING_LOGIN_NOTE.md`. Remove `TRUSTFIRST_HTTP_STAGING_LOGIN=yes` after HTTPS domain setup.

## Safety Confirmation

- CafeLuxe app files untouched: yes
- CafeLuxe database untouched: yes
- CafeLuxe PM2 process untouched: yes
- CafeLuxe Nginx/Caddy site not overwritten: yes
- CafeLuxe port `3000` untouched: yes
- TrustFirst still uses port `3010` internally: yes
