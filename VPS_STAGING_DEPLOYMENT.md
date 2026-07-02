# VPS Staging Deployment Runbook

## Scope

This runbook deploys TrustFirst Client Portal as a VPS-hosted Manglam demo environment. It does not use Vercel, Neon, production client data, or live payment gateways.

## Required Inputs

- VPS host or IP.
- SSH username.
- SSH key or password access.
- Optional demo domain/subdomain.

## Server Requirements

Verify:

```bash
node -v
npm -v
psql --version
git --version
nginx -v || caddy version
pm2 -v || systemctl --version
```

Required:

- Node.js `20.9+`
- npm `10+`
- PostgreSQL `14+`
- Git
- Nginx or Caddy
- PM2 or systemd

## App Directory

```bash
sudo mkdir -p /var/www/trustfirst-client-portal
sudo chown -R "$USER":"$USER" /var/www/trustfirst-client-portal
cd /var/www/trustfirst-client-portal
git clone https://github.com/nitinkumawat9661/trustfirst-client-portal.git .
npm ci
```

## PostgreSQL

Create a VPS-only demo database:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE trustfirst_demo;
CREATE USER trustfirst_demo WITH PASSWORD '<generated-strong-password>';
GRANT ALL PRIVILEGES ON DATABASE trustfirst_demo TO trustfirst_demo;
\q
```

Never reuse a production database.

## Environment File

Create:

```bash
sudo install -m 600 -o "$USER" -g "$USER" /dev/null /etc/trustfirst-client-portal.env
```

Required values:

```bash
DATABASE_URL="postgresql://trustfirst_demo:<generated-password>@127.0.0.1:5432/trustfirst_demo?schema=public"
AUTH_SECRET="<generated-by-node-crypto>"
AUTH_URL="https://<demo-domain-or-ip>"
NODE_ENV="production"
STORAGE_DRIVER="local"
UPLOAD_DIR="/var/www/trustfirst-client-portal/storage/uploads"
MANGLAM_DEMO_ADMIN_EMAIL="manglam-demo-admin@trustfirst.example.com"
MANGLAM_DEMO_ADMIN_PASSWORD="<generated-local-demo-password>"
```

Generate `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Storage

```bash
mkdir -p /var/www/trustfirst-client-portal/storage/uploads
chmod 750 /var/www/trustfirst-client-portal/storage/uploads
```

The current platform has storage provider contracts. If a module does not yet persist files to local disk, document that in the deployment report.

## Migrations And Seed

Load env without printing values:

```bash
set -a
. /etc/trustfirst-client-portal.env
set +a
```

Run:

```bash
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
npm run deploy:migration-check -- --apply
npm run seed:manglam-demo
```

Verify:

- Tenant slug `manglam-trading-demo`.
- Admin user exists.
- Hardware settings exist.
- Products and stock exist.
- Customers/suppliers exist.
- Demo trade documents exist.

## Build

```bash
npm run build
```

## PM2 Start

```bash
npm install -g pm2
pm2 start "npm run start --workspace @trustfirst/web" --name trustfirst-client-portal --env production
pm2 save
pm2 startup
```

Ensure the PM2 process receives `/etc/trustfirst-client-portal.env`.

## Reverse Proxy

Nginx example:

```nginx
server {
  listen 80;
  server_name demo.example.com;

  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable HTTPS if a domain is available:

```bash
sudo certbot --nginx -d demo.example.com
```

If no domain exists, use the VPS IP and document the lack of HTTPS/domain in `VPS_DEPLOYMENT_REPORT.md`.

## Smoke Test

From local or VPS:

```bash
SMOKE_BASE_URL=<vps-demo-url> npm run deploy:smoke
```

## Demo QA

Open:

- `/admin/release-checklist`
- `/admin/hardware/demo`
- `/admin/hardware/demo/manglam`
- `/admin/hardware/products`
- `/admin/hardware/inventory`
- `/admin/hardware/sales/new`
- `/admin/billing`
- `/offline`
- `/manifest.webmanifest`

Then verify the Manglam flow:

1. Settings ready.
2. Catalog ready.
3. Opening stock ready.
4. Create quotation.
5. Convert quotation to sale.
6. Confirm stock deduction.
7. Invoice draft created.
8. A4 print preview opens.
9. Manual payment records.
10. Outstanding updates.
11. Offline queue panel visible.
