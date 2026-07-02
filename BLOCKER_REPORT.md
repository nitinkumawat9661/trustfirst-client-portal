# Preview Environment Blocker Report

## Summary

Sprint 23 cannot complete full Manglam demo readiness because the current Vercel account/project access does not allow Codex to provision a preview PostgreSQL database or write the required preview environment variables.

No production database was used. No database migrations were applied. No secrets are committed.

## What Was Attempted

### Access Inspection

- `vercel --version`
- `vercel project ls --scope team_6sGoY646OLUOQelJ8VrT9i23`
- `vercel env ls preview --scope team_6sGoY646OLUOQelJ8VrT9i23`
- `vercel whoami --scope team_6sGoY646OLUOQelJ8VrT9i23`
- `vercel env pull .env.local --environment=preview --yes --scope team_6sGoY646OLUOQelJ8VrT9i23`
- `npm run deploy:env`

Findings:

- Vercel CLI is installed and authenticated as `nitinkumawat9661`.
- The project is linked as `trustfirst-client-portal`.
- Preview env contains no application variables.
- Pulled `.env.local` contains only Vercel platform metadata.
- Local shell has no `PREVIEW_DATABASE_URL`, `DATABASE_URL`, or usable external preview database URL.

### Database Provisioning Attempt

Command attempted:

```bash
vercel integration add neon --plan free_v3 --name trustfirst-preview-postgres --environment preview --metadata region=iad1 --metadata auth=false --format=json --scope team_6sGoY646OLUOQelJ8VrT9i23
```

Result:

- Vercel returned `integration_terms_acceptance_required`.
- A Neon Marketplace terms acceptance URL was returned.
- Codex cannot accept third-party Marketplace legal terms on behalf of the account owner.

### Preview Env Write Attempts

Commands attempted:

```bash
vercel env add AUTH_SECRET preview --value <generated> --yes --force --scope team_6sGoY646OLUOQelJ8VrT9i23
vercel env add AUTH_URL preview --value <preview-url> --yes --force --scope team_6sGoY646OLUOQelJ8VrT9i23
vercel env add NEXTAUTH_URL preview --value <preview-url> --yes --force --scope team_6sGoY646OLUOQelJ8VrT9i23
```

Result:

- Vercel CLI returned `git_branch_required`.

Branch-specific retry:

```bash
vercel env add AUTH_URL preview main --value <preview-url> --yes --force --scope team_6sGoY646OLUOQelJ8VrT9i23
```

Result:

- Vercel returned `branch_not_found` because `main` is the production branch and cannot be used for preview branch-scoped variables.

All-preview branch syntax attempts:

```bash
vercel env add AUTH_URL preview "*" --value <preview-url> --yes --force --scope team_6sGoY646OLUOQelJ8VrT9i23
vercel env add AUTH_URL preview all --value <preview-url> --yes --force --scope team_6sGoY646OLUOQelJ8VrT9i23
```

Result:

- Vercel returned GitHub `409` with `Git Repository is empty`.

REST API attempt using the local Vercel CLI auth token:

- `POST /v10/projects/{projectId}/env?teamId={teamId}`
- Targets: `preview`
- Variables attempted: `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`

Result:

- Vercel API returned `403 forbidden`.

## Missing Access

The following access or action is required before Codex can continue:

1. Accept Neon Marketplace terms for the Vercel team, or provide another preview-only PostgreSQL connection string through a secure environment variable such as `PREVIEW_DATABASE_URL`.
2. Grant Vercel permissions that allow preview environment variables to be created for the project, or fix the linked Git repository/branch state so `vercel env add ... preview` works.

## Why Codex Cannot Proceed

- Creating Neon through Vercel Marketplace requires legal terms acceptance.
- No existing preview database URL is available.
- Vercel preview env writes fail through both CLI and REST API with the available authenticated access.
- Running migrations or seeding without a confirmed preview-only database would risk violating the explicit rule to never use production database.

## Required Next Access

One of these paths is required:

- Accept Neon Marketplace terms, then rerun:

```bash
vercel integration add neon --plan free_v3 --name trustfirst-preview-postgres --environment preview --metadata region=iad1 --metadata auth=false --format=json --scope team_6sGoY646OLUOQelJ8VrT9i23
```

- Or provide a preview-only PostgreSQL URL as a secure shell variable named `PREVIEW_DATABASE_URL`, then Codex can add it to Vercel preview env and continue.

After the database/env blocker is resolved, rerun:

```bash
vercel env pull .env.local --environment=preview --yes
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
npm run deploy:migration-check -- --apply
npm run seed:manglam-demo
SMOKE_BASE_URL=https://trustfirst-client-portal-gz8kl8z77-nitin-kumawat-s-projects.vercel.app npm run deploy:smoke
```
