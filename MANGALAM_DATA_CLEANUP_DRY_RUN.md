# Mangalam Data Cleanup Dry Run

Generated: 24 July 2026, 09:17:31 UTC
Backup gate: `/var/backups/trustfirst-client-portal/20260724T090932Z`
Mode: `DRY_RUN`

## Preservation Gates

- `PUB-REQ-2026-0015`: `KEEP_REAL`
- Official legal/GST identity: `KEEP_REAL`
- Approved logo and tenant branding: `KEEP_REAL`
- Protected GST certificate and source invoices: `KEEP_REAL`
- Tenant, membership, roles, permissions, migrations, and runtime configuration: `KEEP_SYSTEM`

## DELETE_DEMO

| Type | Count | Exact records |
| --- | ---: | --- |
| Products | 8 | `SS-SCREW-PACK`, `CPVC-PIPE-1IN`, `PVC-ELBOW-90`, `CHR-PILLAR-TAP`, `BRASS-BALL-VALVE-1`, `CEMENT-BAG-50KG`, `BATH-TOWEL-RING`, `CERAMIC-WASH-BASIN` |
| Inventory movements | 10 | 8 `manglam_demo_seed` opening movements; 2 QA `SALES_ORDER` movements |
| Parties | 6 | Sample Walk-in Customer; Sample Contractor Account; Sample Project Buyer; Sample Pipe Supplier; Sample Sanitary Supplier; Sample Building Material Supplier |
| Trade documents | 7 | `MTC-QUO-2026-0001`, `MTC-SALE-2026-0001`, `MTC-PUR-2026-0001`, `HSQ-2026-0001`, `HSO-2026-0001`, `HSQ-2026-0002`, `HSO-2026-0002` |
| Invoices | 2 | `DRAFT-HSO-2026-0001`, `DRAFT-HSO-2026-0002` |
| Payments | 2 | QA references `SPRINT-36A-QA`, `SPRINT-36B-QA` |
| Categories | 9 | Pipes, Fittings, Taps, Valves, Cement Items, Bathroom Accessories, Sanitary Ware, Electrical Hardware, Fasteners |
| Brands | 5 | GenericFlow, SanitaryPro, BuildRight, TapLine, SecureFast |
| Units | 5 | `PCS`, `BOX`, `BAG`, `KG`, `MTR` |
| Locations | 2 | Main Godown, Retail Counter |

Each document selected outside the explicit seed-number list contains only marked demo products and sample parties, with no project or requirement link.

## DELETE_SMOKE_TEST

The following exact public-intake submissions have smoke/test firm names and are not the authoritative submission:

- `PUB-REQ-2026-0004` (`cmr4kt5ni000j7umj50c70b81`)
- `PUB-REQ-2026-0005` (`cmr4lip5m000r7umjwy34o182`)
- `PUB-REQ-2026-0006` (`cmr4lzkmu000z7umjezf0d57x`)
- `PUB-REQ-2026-0007` (`cmr4m5npm00177umjieoij93i`)
- `PUB-REQ-2026-0009` (`cmr4ml1gs00037u4fwf98l419`)
- `PUB-REQ-2026-0010` (`cmr4mpe0p000b7u4fzkjntxqc`)
- `PUB-REQ-2026-0011` (`cmr4p5jmx00037uv8x9jpkhb1`)
- `PUB-REQ-2026-0012` (`cmrxkr2eh00037uu1g4bv376y`)
- `PUB-REQ-2026-0014` (`cmrxm99vb00037urrxgydkkww`)
- `PUB-REQ-2026-0016` (`cmryimaw6000j7urr7mtpfvob`)

## REVIEW_REQUIRED

These submissions are retained because their contents are not positively classified as smoke/test:

- `PUB-REQ-2026-0001`
- `PUB-REQ-2026-0002`
- `PUB-REQ-2026-0003`
- `PUB-REQ-2026-0008`
- `PUB-REQ-2026-0013`

## Superseded Active Configuration

The apply step may remove only active demo keys (`demoProfile`, demo hardware defaults, release demo route, demo pack, placeholder logo), while preserving configuration history. Official identity fields remain locked. Unconfirmed settings are reset to explicit pending/non-operational values.

No record is selected merely because it is old.
