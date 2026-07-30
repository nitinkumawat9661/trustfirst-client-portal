# Mangalam staging, browser E2E, and backups

## Isolated local staging

The staging environment never accepts a production-like database URL. It uses a disposable PostgreSQL container on `127.0.0.1:55433` and the app on `127.0.0.1:3100`.

```powershell
npm run staging:env
npm run staging:setup
npm run staging:start
```

The generated admin password is stored only in `.env.staging.local`. To destroy the staging database:

```powershell
npm run staging:stop
```

The PostgreSQL container uses `tmpfs`; its records disappear when the container is removed.

## Pull-request browser gate

`.github/workflows/mangalam-staging-e2e.yml` creates a fresh PostgreSQL service for every relevant pull request. It performs:

1. Prisma generation and migration deployment.
2. Mangalam staging seed.
3. Lint, all workspace typechecks, unit/service tests, and optimized Next.js build.
4. Real Chromium login.
5. New customer creation from Fast Bill.
6. Keyboard product selection and Quick POS sale posting.
7. Existing customer upgrade to supplier without a duplicate organization.
8. Purchase entry creation.
9. Estimate Bill creation, stock posting, print route, edit, and repost.
10. Direct PostgreSQL assertions for party roles, invoice, purchase, Estimate, stock movements, and financial transactions.

Failure screenshots, video, traces, and application logs are retained for 14 days.

## Encrypted daily production backup

`.github/workflows/mangalam-daily-backup.yml` runs every day at 02:00 Asia/Kolkata and can also be started manually.

Safety properties:

- exact TrustFirst paths only;
- local `trustfirst_demo` PostgreSQL only;
- CafeLuxe paths and port 3000 are not referenced;
- seven days of root-protected VPS backup directories;
- encrypted off-VPS GitHub artifact retained for 30 days;
- plaintext archive is shredded on the runner;
- every backup is decrypted and restored into disposable PostgreSQL;
- restored table counts must match the source manifest before the workflow succeeds.

Encryption uses the public key derived from the existing `VPS_SSH_PRIVATE_KEY` GitHub secret. Keep the previous private key in a secure offline password manager when rotating VPS SSH credentials, otherwise backups encrypted for that previous key cannot be decrypted.

## Restore procedure

1. Download the required encrypted Actions artifact.
2. Retrieve the matching retained VPS SSH private key.
3. Decrypt:

```bash
age --decrypt --identity ./retained-vps-key --output mangalam-backup.tar.gz mangalam-backup.tar.gz.age
```

4. Extract and verify checksums:

```bash
mkdir restore && tar -xzf mangalam-backup.tar.gz -C restore
(cd restore && sha256sum --check SHA256SUMS)
```

5. Restore into a new PostgreSQL database first; do not overwrite production without an approved incident rollback plan.
