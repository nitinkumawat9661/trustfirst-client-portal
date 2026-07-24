# Mangalam Pre-Cleanup Backup Report

## Backup

- Timestamp (UTC): 20260724T090932Z
- TrustFirst database backup: `/var/backups/trustfirst-client-portal/20260724T090932Z/trustfirst_demo.dump`
- Tenant asset backup: `/var/backups/trustfirst-client-portal/20260724T090932Z/tenant-assets.tgz`
- Tenant metadata: `/var/backups/trustfirst-client-portal/20260724T090932Z/tenant-profile.json`
- Candidate inventories: `/var/backups/trustfirst-client-portal/20260724T090932Z/*-inventory.txt`
- Deployed commit: `04d6504fcc79fd0f0c7de5f214df01f6823e5cbc`
- Database dump SHA-256: `2626c16bff246c9bcd29555183c011b2133c35857e884d9583a854fcb4804dea`
- CafeLuxe included or altered: no

## Counts Before Cleanup

| Record | Count |
| --- | ---: |
| Products | 8 |
| Inventory movements | 10 |
| Clients/parties | 7 |
| Hardware trade documents | 7 |
| Requirements | 16 |
| Invoices | 2 |
| Payments | 2 |

## Rollback

1. Stop only `trustfirst-client-portal`.
2. Load `/etc/trustfirst-client-portal.env` without printing it.
3. Restore with `pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" /var/backups/trustfirst-client-portal/20260724T090932Z/trustfirst_demo.dump`.
4. Restore tenant assets from `/var/backups/trustfirst-client-portal/20260724T090932Z/tenant-assets.tgz` if required.
5. Start only `trustfirst-client-portal`, then run runtime and HTTPS smoke checks.

The backup is TrustFirst-only and uses the isolated `trustfirst_demo` database. Unknown or review-required records must not be deleted.
