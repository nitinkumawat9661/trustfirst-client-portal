#!/usr/bin/env bash
set -Eeuo pipefail

required_vars=(
  DEPLOY_SHA
  DEPLOY_ARCHIVE
  DEPLOY_PATH
  PM2_APP_NAME
  PRODUCTION_PORT
  CANARY_PORT
  PRODUCTION_URL
  PUBLIC_URL
)

for name in "${required_vars[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required deployment variable: $name" >&2
    exit 1
  fi
done

ENV_FILE="/etc/trustfirst-client-portal.env"
CANARY_NAME="${PM2_APP_NAME}-canary"
NEXT_DIR="${DEPLOY_PATH}.next.${DEPLOY_SHA}"
BACKUP_DIR="${DEPLOY_PATH}.rollback.$(date +%Y%m%d%H%M%S)"
FAILED_DIR="${DEPLOY_PATH}.failed.${DEPLOY_SHA}"
STORAGE_HOLD="${DEPLOY_PATH}.storage.${DEPLOY_SHA}"
SWITCHED=0
CAFE_BEFORE=""

log() {
  printf '[trustfirst-deploy] %s\n' "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

cleanup_canary() {
  pm2 delete "$CANARY_NAME" >/dev/null 2>&1 || true
}

restore_previous_release() {
  local reason="$1"
  log "Production verification failed: $reason"
  cleanup_canary

  if [ "$SWITCHED" = "1" ] && [ -d "$BACKUP_DIR" ]; then
    log "Restoring previous TrustFirst release."
    pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true

    rm -rf "$FAILED_DIR"
    if [ -d "$DEPLOY_PATH" ]; then
      if [ -d "$DEPLOY_PATH/storage" ]; then
        rm -rf "$STORAGE_HOLD"
        mv "$DEPLOY_PATH/storage" "$STORAGE_HOLD"
      fi
      mv "$DEPLOY_PATH" "$FAILED_DIR"
    fi

    mv "$BACKUP_DIR" "$DEPLOY_PATH"
    if [ -d "$STORAGE_HOLD" ]; then
      rm -rf "$DEPLOY_PATH/storage"
      mv "$STORAGE_HOLD" "$DEPLOY_PATH/storage"
    fi

    cd "$DEPLOY_PATH"
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    PORT="$PRODUCTION_PORT" pm2 start npm \
      --name "$PM2_APP_NAME" \
      --cwd "$DEPLOY_PATH" \
      --time \
      --update-env \
      -- run start --workspace @trustfirst/web -- --hostname 127.0.0.1
  fi

  exit 1
}

trap 'cleanup_canary' EXIT

[ "$DEPLOY_PATH" = "/var/www/trustfirst-client-portal" ] || fail "Unexpected deployment path: $DEPLOY_PATH"
[ "$PM2_APP_NAME" = "trustfirst-client-portal" ] || fail "Unexpected PM2 process: $PM2_APP_NAME"
[ "$PRODUCTION_PORT" = "3010" ] || fail "Unexpected production port: $PRODUCTION_PORT"
[ "$CANARY_PORT" = "3012" ] || fail "Unexpected canary port: $CANARY_PORT"
[ "$PRODUCTION_PORT" != "3000" ] || fail "CafeLuxe port 3000 is forbidden."
[ "$CANARY_PORT" != "3000" ] || fail "CafeLuxe port 3000 is forbidden."
[ -f "$ENV_FILE" ] || fail "Missing production environment file: $ENV_FILE"
[ -f "$DEPLOY_ARCHIVE" ] || fail "Missing uploaded release archive: $DEPLOY_ARCHIVE"
command -v node >/dev/null 2>&1 || fail "Node.js is not installed."
command -v npm >/dev/null 2>&1 || fail "npm is not installed."
command -v pm2 >/dev/null 2>&1 || fail "PM2 is not installed."
command -v curl >/dev/null 2>&1 || fail "curl is not installed."

case "$DEPLOY_PATH:$PM2_APP_NAME:$ENV_FILE" in
  *[Cc]afe[Ll]uxe*|*[Cc]afe[Ll]uxesite*) fail "TrustFirst deployment target references CafeLuxe." ;;
esac

CAFE_BEFORE="$(ss -ltnp 2>/dev/null | grep -E '[:.]3000[[:space:]]' || true)"
log "CafeLuxe port 3000 snapshot captured."

if ss -ltn 2>/dev/null | grep -Eq "[:.]${CANARY_PORT}[[:space:]]"; then
  if pm2 describe "$CANARY_NAME" >/dev/null 2>&1; then
    cleanup_canary
  else
    fail "Canary port $CANARY_PORT is occupied by an unrelated process."
  fi
fi

rm -rf "$NEXT_DIR"
mkdir -p "$NEXT_DIR"
tar -xzf "$DEPLOY_ARCHIVE" -C "$NEXT_DIR"
rm -f "$DEPLOY_ARCHIVE"
printf '%s\n' "$DEPLOY_SHA" > "$NEXT_DIR/.trustfirst-deployed-commit"

cd "$NEXT_DIR"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

case "${DATABASE_URL:-}" in
  *trustfirst_demo*trustfirst_demo*|*trustfirst_demo*@*trustfirst_demo*) ;;
  *) fail "DATABASE_URL is not isolated to trustfirst_demo user/database." ;;
esac
case "${DATABASE_URL:-}" in
  *127.0.0.1*|*localhost*) ;;
  *) fail "DATABASE_URL must point to the local TrustFirst database." ;;
esac

log "Installing production dependencies and building release."
npm ci --include=dev
npm run deploy:env
npm run db:generate

MIGRATION_STATUS="$(npm exec --workspace @trustfirst/database -- prisma migrate status --schema prisma/schema.prisma 2>&1)" || {
  printf '%s\n' "$MIGRATION_STATUS" >&2
  fail "Prisma migration status failed. No migration was applied."
}
printf '%s\n' "$MIGRATION_STATUS"
if printf '%s\n' "$MIGRATION_STATUS" | grep -qi "Following migrations have not yet been applied"; then
  fail "Pending database migrations detected. Deployment stopped without applying them."
fi

npm run build

log "Starting canary on port $CANARY_PORT."
PORT="$CANARY_PORT" pm2 start npm \
  --name "$CANARY_NAME" \
  --cwd "$NEXT_DIR" \
  --time \
  --update-env \
  -- run start --workspace @trustfirst/web -- --hostname 127.0.0.1

CANARY_READY=0
for attempt in $(seq 1 45); do
  if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:${CANARY_PORT}/api/auth/session" >/dev/null; then
    CANARY_READY=1
    break
  fi
  sleep 1
done
[ "$CANARY_READY" = "1" ] || fail "Canary did not become healthy. Production remains unchanged."
log "Canary health check passed."
cleanup_canary

rm -rf "$BACKUP_DIR" "$FAILED_DIR" "$STORAGE_HOLD"
if [ -d "$DEPLOY_PATH" ]; then
  mv "$DEPLOY_PATH" "$BACKUP_DIR"
fi
mv "$NEXT_DIR" "$DEPLOY_PATH"

if [ -d "$BACKUP_DIR/storage" ]; then
  mv "$BACKUP_DIR/storage" "$STORAGE_HOLD"
  rm -rf "$DEPLOY_PATH/storage"
  mv "$STORAGE_HOLD" "$DEPLOY_PATH/storage"
fi
SWITCHED=1

log "Restarting only $PM2_APP_NAME on port $PRODUCTION_PORT."
pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true
cd "$DEPLOY_PATH"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
PORT="$PRODUCTION_PORT" pm2 start npm \
  --name "$PM2_APP_NAME" \
  --cwd "$DEPLOY_PATH" \
  --time \
  --update-env \
  -- run start --workspace @trustfirst/web -- --hostname 127.0.0.1

PRODUCTION_READY=0
for attempt in $(seq 1 45); do
  if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:${PRODUCTION_PORT}/api/auth/session" >/dev/null; then
    PRODUCTION_READY=1
    break
  fi
  sleep 1
done
[ "$PRODUCTION_READY" = "1" ] || restore_previous_release "Loopback health check failed."

curl --silent --show-error --fail --max-time 15 "$PRODUCTION_URL/api/auth/session" >/dev/null \
  || restore_previous_release "ERP domain health check failed."
curl --silent --show-error --fail --max-time 15 "$PUBLIC_URL" >/dev/null \
  || restore_previous_release "Public Mangalam domain health check failed."

CAFE_AFTER="$(ss -ltnp 2>/dev/null | grep -E '[:.]3000[[:space:]]' || true)"
[ "$CAFE_AFTER" = "$CAFE_BEFORE" ] || restore_previous_release "CafeLuxe port 3000 listener changed unexpectedly."

printf '%s\n' "$DEPLOY_SHA" > "$DEPLOY_PATH/.trustfirst-deployed-commit"
rm -rf "$BACKUP_DIR"
SWITCHED=0
trap - EXIT
cleanup_canary

log "Deployment completed successfully."
log "Deployed commit: $DEPLOY_SHA"
log "Production port: $PRODUCTION_PORT"
log "Canary port: $CANARY_PORT"
log "CafeLuxe untouched: yes"
log "Database migrations applied: no"
log "Seed/data mutation performed: no"
