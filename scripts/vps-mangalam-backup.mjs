import fs from "node:fs";
import path from "node:path";
import {
  loadDeployConfig,
  repoRoot,
  runSsh,
  shellQuote,
  validateDeployConfig,
} from "./vps-utils.mjs";

const config = loadDeployConfig();
validateDeployConfig(config);

const remote = `
set -euo pipefail
APP_DIR=${shellQuote(config.DEPLOY_APP_DIR)}
ENV_FILE=${shellQuote(config.DEPLOY_ENV_FILE)}
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/var/backups/trustfirst-client-portal/$STAMP"

if [ "$APP_DIR" != "/var/www/trustfirst-client-portal" ] || [ "$ENV_FILE" != "/etc/trustfirst-client-portal.env" ]; then
  echo "Refusing non-isolated backup paths." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

case "$DATABASE_URL" in
  *trustfirst_demo*trustfirst_demo*|*trustfirst_demo*@*trustfirst_demo*) ;;
  *) echo "Refusing non-TrustFirst demo database backup." >&2; exit 1 ;;
esac
case "$DATABASE_URL" in
  *127.0.0.1*|*localhost*) ;;
  *) echo "Refusing non-local database backup." >&2; exit 1 ;;
esac
case "$DATABASE_URL" in
  *prod*|*production*|*live*) echo "Refusing production-like database URL." >&2; exit 1 ;;
esac
PG_URL="\${DATABASE_URL%%\\?*}"

sudo mkdir -p "$BACKUP_DIR"
sudo chown "$(id -un):$(id -gn)" "$BACKUP_DIR"

pg_dump --format=custom --no-owner --no-acl --file "$BACKUP_DIR/trustfirst_demo.dump" "$PG_URL"
cp "$APP_DIR/.trustfirst-deployed-commit" "$BACKUP_DIR/deployed-commit.txt"
cp "$APP_DIR/config/client-profiles/manglam-trading-demo/official-identity.json" "$BACKUP_DIR/official-identity.json"
cp "$APP_DIR/config/client-profiles/manglam-trading-demo/source-document-register.json" "$BACKUP_DIR/source-document-register.json"
tar -czf "$BACKUP_DIR/tenant-assets.tgz" -C "$APP_DIR/storage" client-assets/manglam-trading-demo

psql "$PG_URL" -X -A -t -c "SELECT json_build_object('slug',slug,'name',name,'primaryDomain',\\"primaryDomain\\",'branding',branding,'settings',settings) FROM \\"Tenant\\" WHERE slug='manglam-trading-demo';" > "$BACKUP_DIR/tenant-profile.json"
psql "$PG_URL" -X -A -F '|' -t -c "SELECT r.id,COALESCE(r.metadata->>'submissionNumber',''),r.title,r.\\"createdAt\\" FROM \\"Requirement\\" r JOIN \\"Tenant\\" t ON t.id=r.\\"tenantId\\" WHERE t.slug='manglam-trading-demo' ORDER BY r.\\"createdAt\\";" > "$BACKUP_DIR/requirement-inventory.txt"
psql "$PG_URL" -X -A -F '|' -t -c "SELECT c.id,c.slug,c.name,c.metadata FROM \\"ClientOrganization\\" c JOIN \\"Tenant\\" t ON t.id=c.\\"tenantId\\" WHERE t.slug='manglam-trading-demo' ORDER BY c.\\"createdAt\\";" > "$BACKUP_DIR/client-inventory.txt"
psql "$PG_URL" -X -A -F '|' -t -c "SELECT p.id,p.sku,p.name,p.metadata FROM \\"HardwareProduct\\" p JOIN \\"Tenant\\" t ON t.id=p.\\"tenantId\\" WHERE t.slug='manglam-trading-demo' ORDER BY p.\\"createdAt\\";" > "$BACKUP_DIR/product-inventory.txt"

count_table() {
  psql "$PG_URL" -X -A -t -c "$1"
}

TENANT_ID="$(count_table "SELECT id FROM \\"Tenant\\" WHERE slug='manglam-trading-demo';")"
PRODUCTS="$(count_table "SELECT count(*) FROM \\"HardwareProduct\\" WHERE \\"tenantId\\"='$TENANT_ID';")"
MOVEMENTS="$(count_table "SELECT count(*) FROM \\"HardwareInventoryMovement\\" WHERE \\"tenantId\\"='$TENANT_ID';")"
CLIENTS="$(count_table "SELECT count(*) FROM \\"ClientOrganization\\" WHERE \\"tenantId\\"='$TENANT_ID';")"
TRADE_DOCUMENTS="$(count_table "SELECT count(*) FROM \\"HardwareTradeDocument\\" WHERE \\"tenantId\\"='$TENANT_ID';")"
REQUIREMENTS="$(count_table "SELECT count(*) FROM \\"Requirement\\" WHERE \\"tenantId\\"='$TENANT_ID';")"
INVOICES="$(count_table "SELECT count(*) FROM \\"Invoice\\" WHERE \\"tenantId\\"='$TENANT_ID';")"
PAYMENTS="$(count_table "SELECT count(*) FROM \\"PaymentRecord\\" WHERE \\"tenantId\\"='$TENANT_ID';")"

printf 'products|%s\\nmovements|%s\\nclients|%s\\ntrade_documents|%s\\nrequirements|%s\\ninvoices|%s\\npayments|%s\\n' \
  "$PRODUCTS" "$MOVEMENTS" "$CLIENTS" "$TRADE_DOCUMENTS" "$REQUIREMENTS" "$INVOICES" "$PAYMENTS" \
  > "$BACKUP_DIR/record-counts-before.txt"

sha256sum "$BACKUP_DIR/trustfirst_demo.dump" "$BACKUP_DIR/tenant-assets.tgz" "$BACKUP_DIR/tenant-profile.json" > "$BACKUP_DIR/SHA256SUMS"
chmod 600 "$BACKUP_DIR"/*

printf '__BACKUP_DIR__=%s\\n' "$BACKUP_DIR"
printf '__BACKUP_TIMESTAMP__=%s\\n' "$STAMP"
printf '__DEPLOYED_COMMIT__=%s\\n' "$(cat "$BACKUP_DIR/deployed-commit.txt")"
printf '__BACKUP_SHA256__=%s\\n' "$(awk 'NR==1 {print $1}' "$BACKUP_DIR/SHA256SUMS")"
printf '__PRODUCTS__=%s\\n' "$PRODUCTS"
printf '__MOVEMENTS__=%s\\n' "$MOVEMENTS"
printf '__CLIENTS__=%s\\n' "$CLIENTS"
printf '__TRADE_DOCUMENTS__=%s\\n' "$TRADE_DOCUMENTS"
printf '__REQUIREMENTS__=%s\\n' "$REQUIREMENTS"
printf '__INVOICES__=%s\\n' "$INVOICES"
printf '__PAYMENTS__=%s\\n' "$PAYMENTS"
printf '__CAFE_LUXE_UNTOUCHED__=yes\\n'
`;

const result = runSsh(config, `bash -lc ${shellQuote(remote)}`);
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Mangalam backup failed.\n");
  process.exit(result.status ?? 1);
}

const markers = parseMarkers(result.stdout);
for (const required of [
  "__BACKUP_DIR__",
  "__BACKUP_TIMESTAMP__",
  "__DEPLOYED_COMMIT__",
  "__BACKUP_SHA256__",
]) {
  if (!markers[required]) throw new Error(`Backup result is missing ${required}.`);
}

const report = `# Mangalam Pre-Cleanup Backup Report

## Backup

- Timestamp (UTC): ${markers.__BACKUP_TIMESTAMP__}
- TrustFirst database backup: \`${markers.__BACKUP_DIR__}/trustfirst_demo.dump\`
- Tenant asset backup: \`${markers.__BACKUP_DIR__}/tenant-assets.tgz\`
- Tenant metadata: \`${markers.__BACKUP_DIR__}/tenant-profile.json\`
- Candidate inventories: \`${markers.__BACKUP_DIR__}/*-inventory.txt\`
- Deployed commit: \`${markers.__DEPLOYED_COMMIT__}\`
- Database dump SHA-256: \`${markers.__BACKUP_SHA256__}\`
- CafeLuxe included or altered: no

## Counts Before Cleanup

| Record | Count |
| --- | ---: |
| Products | ${markers.__PRODUCTS__} |
| Inventory movements | ${markers.__MOVEMENTS__} |
| Clients/parties | ${markers.__CLIENTS__} |
| Hardware trade documents | ${markers.__TRADE_DOCUMENTS__} |
| Requirements | ${markers.__REQUIREMENTS__} |
| Invoices | ${markers.__INVOICES__} |
| Payments | ${markers.__PAYMENTS__} |

## Rollback

1. Stop only \`trustfirst-client-portal\`.
2. Load \`/etc/trustfirst-client-portal.env\` without printing it.
3. Restore with \`pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" ${markers.__BACKUP_DIR__}/trustfirst_demo.dump\`.
4. Restore tenant assets from \`${markers.__BACKUP_DIR__}/tenant-assets.tgz\` if required.
5. Start only \`trustfirst-client-portal\`, then run runtime and HTTPS smoke checks.

The backup is TrustFirst-only and uses the isolated \`trustfirst_demo\` database. Unknown or review-required records must not be deleted.
`;

fs.writeFileSync(path.join(repoRoot, "MANGALAM_PRE_CLEANUP_BACKUP_REPORT.md"), report, "utf8");
console.log(`TrustFirst-only backup completed at ${markers.__BACKUP_DIR__}.`);
console.log("Backup report written without database credentials.");

function parseMarkers(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter((line) => line.startsWith("__") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}
