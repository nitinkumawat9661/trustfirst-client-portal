# Local Demo Setup

## Goal

Run the Manglam Trading demo fully on a developer laptop without Vercel preview database access.

## Prerequisites

- Node.js and npm matching the repository engines.
- Docker Desktop, or an externally installed PostgreSQL database.

Docker is optional for the scripts, but required if you want to use `docker-compose.demo.yml`.

## Start Local PostgreSQL With Docker

```bash
docker compose -f docker-compose.demo.yml up -d
```

The demo database URL is:

```text
postgresql://trustfirst_demo:trustfirst_demo@127.0.0.1:55432/trustfirst_manglam_demo?schema=public
```

This is local-only and must not be used for production.

## Configure Demo Env

```bash
npm run demo:env
```

This creates `.env.demo.local` from `.env.demo.example` if missing, generates a local `AUTH_SECRET`, and generates a local demo admin password.

Existing local secrets are not overwritten. To regenerate local demo secrets:

```bash
npm run demo:env -- --force
```

## Setup Database And Seed

```bash
npm run demo:setup
```

This runs:

- `demo:env`
- `demo:db`
- `demo:manglam`
- `deploy:env`
- `db:generate`

## Start App

```bash
npm run demo:start
```

Demo URL:

```text
http://localhost:3000
```

## Demo Credentials

Demo admin email:

```text
manglam-demo-admin@trustfirst.example.com
```

The local password is generated into `.env.demo.local` as `MANGLAM_DEMO_ADMIN_PASSWORD`. This file is ignored by git and must not be committed.

To regenerate credentials:

```bash
npm run demo:env -- --force
npm run demo:manglam
```
