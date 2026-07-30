#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${DEPLOY_APP_DIR:-/var/www/trustfirst-client-portal}"
ENV_FILE="${DEPLOY_ENV_FILE:-/etc/trustfirst-client-portal.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/trustfirst-client-portal/daily}"
TENANT_SLUG="manglam-trading-demo"

if [[ "$APP_DIR" != "/var/www/trustfirst-client-portal" ]]; then
  echo "Refusing non-TrustFirst application path." >&2
  exit 1
fi
if [[ "$ENV_FILE" != "/etc/trustfirst-client-portal.env" ]]; then
  echo "Refusing non-TrustFirst environment path." >&2
  exit 1
fi
if [[ ! -r "$ENV_FILE" ]]; then
  echo "TrustFirst environment file is not readable." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is missing." >&2
  exit 1
fi
case "$DATABASE_URL" in
  *127.0.0.1*|*localhost*) ;;
  *) echo "Refusing a non-local PostgreSQL database." >&2; exit 1 ;;
esac
case "${DATABASE_URL,,}" in
  *trustfirst_demo*) ;;
  *) echo "Refusing a database that is not TrustFirst-isolated." >&2; exit 1 ;;
esac

PG_URL="${DATABASE_URL%%\?*}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$BACKUP_ROOT/$STAMP"
ARCHIVE="/tmp/mangalam-backup-$STAMP.tar.gz"
CURRENT_USER="$(id -un)"
CURRENT_GROUP="$(id -gn)"

sudo install -d -m 700 -o "$CURRENT_USER" -g "$CURRENT_GROUP" "$BACKUP_ROOT"
install -d -m 700 "$WORK_DIR"

pg_dump --format=custom --compress=9 --no-owner --no-acl --file "$WORK_DIR/trustfirst_demo.dump" "$PG_URL"
psql "$PG_URL" -v ON_ERROR_STOP=1 -X -A -t -c \
  "SELECT id FROM \"Tenant\" WHERE slug='$TENANT_SLUG';" > "$WORK_DIR/tenant-id.txt"
TENANT_ID="$(tr -d '[:space:]' < "$WORK_DIR/tenant-id.txt")"
if [[ -z "$TENANT_ID" ]]; then
  echo "Mangalam tenant was not found in the backup source." >&2
  exit 1
fi

count_table() {
  psql "$PG_URL" -v ON_ERROR_STOP=1 -X -A -t -c "$1" | tr -d '[:space:]'
}

PRODUCTS="$(count_table "SELECT count(*) FROM \"HardwareProduct\" WHERE \"tenantId\"='$TENANT_ID';")"
MOVEMENTS="$(count_table "SELECT count(*) FROM \"HardwareInventoryMovement\" WHERE \"tenantId\"='$TENANT_ID';")"
PARTIES="$(count_table "SELECT count(*) FROM \"ClientOrganization\" WHERE \"tenantId\"='$TENANT_ID' AND \"deletedAt\" IS NULL;")"
TRADE_DOCUMENTS="$(count_table "SELECT count(*) FROM \"HardwareTradeDocument\" WHERE \"tenantId\"='$TENANT_ID';")"
INVOICES="$(count_table "SELECT count(*) FROM \"Invoice\" WHERE \"tenantId\"='$TENANT_ID';")"
FINANCIAL_TRANSACTIONS="$(count_table "SELECT count(*) FROM \"FinancialTransaction\" WHERE \"tenantId\"='$TENANT_ID';")"

cat > "$WORK_DIR/record-counts.env" <<COUNTS
TENANT_SLUG=$TENANT_SLUG
PRODUCTS=$PRODUCTS
MOVEMENTS=$MOVEMENTS
PARTIES=$PARTIES
TRADE_DOCUMENTS=$TRADE_DOCUMENTS
INVOICES=$INVOICES
FINANCIAL_TRANSACTIONS=$FINANCIAL_TRANSACTIONS
COUNTS

if [[ -f "$APP_DIR/.trustfirst-deployed-commit" ]]; then
  cp "$APP_DIR/.trustfirst-deployed-commit" "$WORK_DIR/deployed-commit.txt"
else
  printf 'unknown\n' > "$WORK_DIR/deployed-commit.txt"
fi

for metadata_file in \
  "$APP_DIR/config/client-profiles/manglam-trading-demo/official-identity.json" \
  "$APP_DIR/config/client-profiles/manglam-trading-demo/source-document-register.json"; do
  if [[ -f "$metadata_file" ]]; then
    cp "$metadata_file" "$WORK_DIR/"
  fi
done

if [[ -d "$APP_DIR/storage/client-assets/manglam-trading-demo" ]]; then
  tar -czf "$WORK_DIR/tenant-assets.tgz" -C "$APP_DIR/storage" client-assets/manglam-trading-demo
else
  tar -czf "$WORK_DIR/tenant-assets.tgz" --files-from /dev/null
fi

(
  cd "$WORK_DIR"
  sha256sum trustfirst_demo.dump tenant-assets.tgz record-counts.env deployed-commit.txt > SHA256SUMS
)
chmod 600 "$WORK_DIR"/*
tar -czf "$ARCHIVE" -C "$WORK_DIR" .
chmod 600 "$ARCHIVE"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +6 -print0 | xargs -0r rm -rf --

printf '__BACKUP_ARCHIVE__=%s\n' "$ARCHIVE"
printf '__BACKUP_DIR__=%s\n' "$WORK_DIR"
printf '__BACKUP_STAMP__=%s\n' "$STAMP"
printf '__DEPLOYED_COMMIT__=%s\n' "$(cat "$WORK_DIR/deployed-commit.txt")"
printf '__PRODUCTS__=%s\n' "$PRODUCTS"
printf '__MOVEMENTS__=%s\n' "$MOVEMENTS"
printf '__PARTIES__=%s\n' "$PARTIES"
printf '__TRADE_DOCUMENTS__=%s\n' "$TRADE_DOCUMENTS"
printf '__INVOICES__=%s\n' "$INVOICES"
printf '__FINANCIAL_TRANSACTIONS__=%s\n' "$FINANCIAL_TRANSACTIONS"
printf '__CAFE_LUXE_UNTOUCHED__=yes\n'
