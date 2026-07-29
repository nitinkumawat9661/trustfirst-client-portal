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
DEPLOY_ROOT="$HOME/.trustfirst-deploy"
RELEASE_DIR="$DEPLOY_ROOT/releases/$DEPLOY_SHA"
BACKUP_DIR="$DEPLOY_ROOT/backups/$(date +%Y%m%d%H%M%S)-$DEPLOY_SHA"
SWITCHED=0
RESTORING=0
CAFE_BEFORE=""

log() {
  printf '[trustfirst-deploy] %s\n' "$*"
}

copy_tree() {
  local source_dir="$1"
  local target_dir="$2"
  mkdir -p "$target_dir"
  (cd "$source_dir" && tar -cf - .) | (cd "$target_dir" && tar -xf -)
}

cleanup_canary() {
  pm2 delete "$CANARY_NAME" >/dev/null 2>&1 || true
}

start_production() {
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
}

restore_previous_release() {
  local reason="$1"
  local original_status="${2:-1}"

  if [ "$RESTORING" = "1" ]; then
    log "Rollback re-entry blocked. Manual recovery may be required."
    exit "$original_status"
  fi

  RESTORING=1
  trap - ERR
  set +e
  log "Production verification failed: $reason"
  cleanup_canary

  if [ "$SWITCHED" = "1" ] && [ -d "$BACKUP_DIR" ]; then
    log "Restoring previous TrustFirst release."
    pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true
    find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
    copy_tree "$BACKUP_DIR" "$DEPLOY_PATH"
    start_production

    local restored=0
    for attempt in $(seq 1 45); do
      if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:${PRODUCTION_PORT}/api/auth/session" >/dev/null 2>&1; then
        restored=1
        break
      fi
      sleep 1
    done

    if [ "$restored" = "1" ]; then
      log "Previous TrustFirst release restored successfully."
    else
      log "Previous release was copied back, but runtime health verification failed."
    fi
  else
    log "Production was not switched; existing release remains unchanged."
  fi

  exit "$original_status"
}

fail() {
  local message="$1"
  log "ERROR: $message"
  if [ "$SWITCHED" = "1" ]; then
    restore_previous_release "$message" 1
  fi
  exit 1
}

handle_unexpected_error() {
  local status="$1"
  local line="$2"
  restore_previous_release "Unexpected command failure at line $line." "$status"
}

trap 'handle_unexpected_error $? $LINENO' ERR
trap 'cleanup_canary' EXIT

[ "$DEPLOY_PATH" = "/var/www/trustfirst-client-portal" ] || fail "Unexpected deployment path: $DEPLOY_PATH"
[ "$PM2_APP_NAME" = "trustfirst-client-portal" ] || fail "Unexpected PM2 process: $PM2_APP_NAME"
[ "$PRODUCTION_PORT" = "3010" ] || fail "Unexpected production port: $PRODUCTION_PORT"
[ "$CANARY_PORT" = "3012" ] || fail "Unexpected canary port: $CANARY_PORT"
[ "$PRODUCTION_PORT" != "3000" ] || fail "CafeLuxe port 3000 is forbidden."
[ "$CANARY_PORT" != "3000" ] || fail "CafeLuxe port 3000 is forbidden."
[ -f "$ENV_FILE" ] || fail "Missing production environment file: $ENV_FILE"
[ -f "$DEPLOY_ARCHIVE" ] || fail "Missing uploaded release archive: $DEPLOY_ARCHIVE"
[ -d "$DEPLOY_PATH" ] || fail "Existing TrustFirst application directory is missing: $DEPLOY_PATH"
[ -w "$DEPLOY_PATH" ] || fail "Deploy user cannot write to $DEPLOY_PATH"
command -v node >/dev/null 2>&1 || fail "Node.js is not installed."
command -v npm >/dev/null 2>&1 || fail "npm is not installed."
command -v pm2 >/dev/null 2>&1 || fail "PM2 is not installed."
command -v curl >/dev/null 2>&1 || fail "curl is not installed."
command -v tar >/dev/null 2>&1 || fail "tar is not installed."

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

rm -rf "$RELEASE_DIR" "$BACKUP_DIR"
mkdir -p "$RELEASE_DIR" "$BACKUP_DIR"
tar -xzf "$DEPLOY_ARCHIVE" -C "$RELEASE_DIR"
rm -f "$DEPLOY_ARCHIVE"
printf '%s\n' "$DEPLOY_SHA" > "$RELEASE_DIR/.trustfirst-deployed-commit"

cd "$RELEASE_DIR"
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

log "Installing dependencies and building isolated release."
npm ci --include=dev
npm run deploy:env
npm run db:generate

set +e
MIGRATION_STATUS="$(npm exec --workspace @trustfirst/database -- prisma migrate status --schema prisma/schema.prisma 2>&1)"
MIGRATION_EXIT=$?
set -e
printf '%s\n' "$MIGRATION_STATUS"
[ "$MIGRATION_EXIT" -eq 0 ] || fail "Prisma migration status failed. No migration was applied."
if printf '%s\n' "$MIGRATION_STATUS" | grep -qi "Following migrations have not yet been applied"; then
  fail "Pending database migrations detected. Deployment stopped without applying them."
fi

npm run build

log "Starting canary on port $CANARY_PORT."
PORT="$CANARY_PORT" pm2 start npm \
  --name "$CANARY_NAME" \
  --cwd "$RELEASE_DIR" \
  --time \
  --update-env \
  -- run start --workspace @trustfirst/web -- --hostname 127.0.0.1

CANARY_READY=0
for attempt in $(seq 1 45); do
  if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:${CANARY_PORT}/api/auth/session" >/dev/null 2>&1; then
    CANARY_READY=1
    break
  fi
  sleep 1
done
[ "$CANARY_READY" = "1" ] || fail "Canary did not become healthy. Production remains unchanged."
log "Canary health check passed."
cleanup_canary

log "Creating rollback copy without the persistent storage directory."
(cd "$DEPLOY_PATH" && tar --exclude='./storage' -cf - .) | (cd "$BACKUP_DIR" && tar -xf -)

SWITCHED=1
log "Switching TrustFirst application files in place."
pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true
find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
copy_tree "$RELEASE_DIR" "$DEPLOY_PATH"

log "Starting only $PM2_APP_NAME on port $PRODUCTION_PORT."
start_production

PRODUCTION_READY=0
for attempt in $(seq 1 45); do
  if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:${PRODUCTION_PORT}/api/auth/session" >/dev/null 2>&1; then
    PRODUCTION_READY=1
    break
  fi
  sleep 1
done
[ "$PRODUCTION_READY" = "1" ] || fail "Loopback production health check failed."

curl --silent --show-error --fail --max-time 15 "$PRODUCTION_URL/api/auth/session" >/dev/null \
  || fail "ERP domain health check failed."
curl --silent --show-error --fail --max-time 15 "$PUBLIC_URL" >/dev/null \
  || fail "Public Mangalam domain health check failed."

CAFE_AFTER="$(ss -ltnp 2>/dev/null | grep -E '[:.]3000[[:space:]]' || true)"
[ "$CAFE_AFTER" = "$CAFE_BEFORE" ] || fail "CafeLuxe port 3000 listener changed unexpectedly."

printf '%s\n' "$DEPLOY_SHA" > "$DEPLOY_PATH/.trustfirst-deployed-commit"
rm -rf "$BACKUP_DIR" "$RELEASE_DIR"
SWITCHED=0
trap - ERR EXIT
cleanup_canary

log "Deployment completed successfully."
log "Deployed commit: $DEPLOY_SHA"
log "Production port: $PRODUCTION_PORT"
log "Canary port: $CANARY_PORT"
log "CafeLuxe untouched: yes"
log "Database migrations applied: no"
log "Seed/data mutation performed: no"
