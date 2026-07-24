# Mangalam Production Domain

## Production Entry

- Canonical URL: https://mangalamsanitary.in
- WWW behavior: redirects to the canonical domain
- DNS: verified to 45.10.21.141
- Nginx site: `/etc/nginx/sites-available/mangalamsanitary.in`
- TLS certificate: issued for both hostnames
- TrustFirst upstream: `127.0.0.1:3010`
- Public intake status: HTTP 200
- Anonymous admin status: HTTP 307 redirect

## Authentication And Network

- `AUTH_URL` and `NEXTAUTH_URL`: HTTPS canonical origin
- Temporary HTTP staging login gate: removed
- Temporary HTTP staging auth bypass: removed
- Public UFW allowance for 3010/tcp: removed
- Secure-cookie behavior: restored by HTTPS production configuration

## Shared VPS Isolation

- Separate site file: yes
- CafeLuxe site modified: no
- CafeLuxe Nginx SHA-256 after configuration: `22dfac9c997007628fb07d76e17f6d5b23c53fc1e747688daa656d1d389e1ef2`
- CafeLuxe port 3000, files, database, PM2 process, and secrets: untouched
