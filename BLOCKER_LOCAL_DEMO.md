# Local Demo Blocker

## Issue

Docker is not installed or not available on this machine.

Commands checked:

```bash
docker --version
docker compose version
```

Both commands failed because `docker` is not recognized by the shell.

## Impact

The repository now includes `docker-compose.demo.yml`, but Codex cannot start the local PostgreSQL demo service on this laptop until Docker Desktop or another Docker-compatible runtime is installed.

## Fallback Without Docker

Install PostgreSQL externally and create a local-only demo database matching `.env.demo.example`:

```bash
createdb trustfirst_manglam_demo
createuser trustfirst_demo
```

Then grant access and set the password to `trustfirst_demo`, or update `.env.demo.local` with another local/demo-only `DATABASE_URL`.

The URL must remain local or clearly demo-named. The demo scripts refuse production-like database URLs.

## Continue After PostgreSQL Is Available

```bash
npm run demo:env
npm run demo:db
npm run demo:manglam
npm run demo:start
```

Or run the one-command setup:

```bash
npm run demo:setup
```
