# Mangalam Pre-Cleanup Backup Report

## Backup

- Timestamp (UTC): 20260727T083505Z
- TrustFirst database backup: `/var/backups/trustfirst-client-portal/20260727T083505Z/trustfirst_demo.dump`
- Tenant asset backup: `/var/backups/trustfirst-client-portal/20260727T083505Z/tenant-assets.tgz`
- Tenant metadata: `/var/backups/trustfirst-client-portal/20260727T083505Z/tenant-profile.json`
- Candidate inventories: `/var/backups/trustfirst-client-portal/20260727T083505Z/*-inventory.txt`
- Deployed commit: `71b21a1d9aab242477d5de217ecb01244497d62c`
- Database dump SHA-256: `a7c28f613a9962886a38a5b44ae00e0eb2a6755c183fb27c6e731d91a51df80c`
- CafeLuxe included or altered: no

## Counts Before Cleanup

| Record | Count |
| --- | ---: |
| Products | 1 |
| Inventory movements | 0 |
| Clients/parties | 1 |
| Hardware trade documents | 0 |
| Requirements | 18 |
| Invoices | 0 |
| Payments | 0 |

## Rollback

1. Stop only `trustfirst-client-portal`.
2. Load `/etc/trustfirst-client-portal.env` without printing it.
3. Restore with `pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" /var/backups/trustfirst-client-portal/20260727T083505Z/trustfirst_demo.dump`.
4. Restore tenant assets from `/var/backups/trustfirst-client-portal/20260727T083505Z/tenant-assets.tgz` if required.
5. Start only `trustfirst-client-portal`, then run runtime and HTTPS smoke checks.

The backup is TrustFirst-only and uses the isolated `trustfirst_demo` database. Unknown or review-required records must not be deleted.
