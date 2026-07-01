# Development

## Local Database

```bash
docker compose up -d postgres
npm run db:generate
npm run db:migrate
```

## Application

```bash
npm run dev
```

The web application runs from `apps/web`.

## Quality Gates

Run before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run build
```
