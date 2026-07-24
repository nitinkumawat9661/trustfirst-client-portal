# Mangalam Data Cleanup Report

## Execution

- Tenant: `manglam-trading-demo`
- Mode: `APPLY`
- Applied at: 24 July 2026, 09:19:22 UTC
- Backup used: `/var/backups/trustfirst-client-portal/20260724T090932Z`
- Database: isolated TrustFirst database `trustfirst_demo`
- Dry run reviewed before apply: yes
- Unknown and `REVIEW_REQUIRED` records deleted: no
- CafeLuxe included or modified: no

## Deleted Records

| Classification | Record type | Deleted |
| --- | --- | ---: |
| `DELETE_DEMO` | Products | 8 |
| `DELETE_DEMO` | Inventory movements | 10 |
| `DELETE_DEMO` | Clients/parties | 6 |
| `DELETE_DEMO` | Trade documents | 7 |
| `DELETE_DEMO` | Invoices | 2 |
| `DELETE_DEMO` | Payments | 2 |
| `DELETE_DEMO` | Categories | 9 |
| `DELETE_DEMO` | Brands | 5 |
| `DELETE_DEMO` | Units | 5 |
| `DELETE_DEMO` | Stock locations | 2 |
| `DELETE_SMOKE_TEST` | Public intake requirements | 10 |
| `DELETE_DEMO` | Timeline events | 0 |

The deleted IDs and labels are recorded in `MANGALAM_DATA_CLEANUP_DRY_RUN.md`. Deletion used exact IDs selected by seed markers, known QA references, known smoke names, and validated relationships.

## Counts After Cleanup

| Record | Before | After |
| --- | ---: | ---: |
| Products | 8 | 0 |
| Inventory movements | 10 | 0 |
| Clients/parties | 7 | 1 |
| Hardware trade documents | 7 | 0 |
| Requirements | 16 | 6 |
| Invoices | 2 | 0 |
| Payments | 2 | 0 |

The six retained requirements are the authoritative real submission plus five records classified `REVIEW_REQUIRED`.

## Preserved

- `PUB-REQ-2026-0015`: preserved as `KEEP_REAL`
- Official trade name `MANGALAM SANITARY`: preserved
- Legal proprietor `KRISHAN KUMAR`: preserved
- GSTIN `08EFPK7672A1ZT`: preserved
- Official registered address: preserved
- Approved black/gold logo: preserved
- GST registration certificate: preserved
- Client-provided source invoices and their register: preserved
- Tenant, membership, roles, permissions, migrations, runtime configuration, and audit foundation: preserved
- Five ambiguous public intake records: retained as `REVIEW_REQUIRED`

## Future Seed Safety

The Mangalam seed command now detects the locked official identity and skips generic business records. The authenticated demo seed/reset API also refuses to operate for an official locked tenant. This prevents a later deployment from repopulating cleaned demo products, stock, parties, or documents.

## Rollback

Follow `MANGALAM_PRE_CLEANUP_BACKUP_REPORT.md`. Restore only the TrustFirst database dump and tenant assets from the timestamped backup, then restart only `trustfirst-client-portal` and rerun runtime and HTTPS smoke checks.
