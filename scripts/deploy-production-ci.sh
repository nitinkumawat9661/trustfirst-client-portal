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
OLD_PM2_ID=""
OLD_PM2_NAME=""
OLD_PM2_CWD=""
OLD_PM2_RETAINED=0

log() {
  printf '[trustfirst-deploy] %s\n' "$*"
}

canonical_loopback_health() {
  local port="$1"
  curl --silent --show-error --fail --max-time 3 \
    --header "Host: app.mangalamsanitary.in" \
    --header "X-Forwarded-Host: app.mangalamsanitary.in" \
    --header "X-Forwarded-Proto: https" \
    --header "X-Forwarded-Port: 443" \
    "http://127.0.0.1:${port}/api/auth/session" >/dev/null
}

need_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

safe_trustfirst_path() {
  case "$1" in
    /var/www/trustfirst-client-portal|/var/www/trustfirst-client-portal/*|/var/www/trustfirst-client-portal-releases/*) return 0 ;;
    *) return 1 ;;
  esac
}

trustfirst_process_name() {
  case "$1" in
    [Tt][Rr][Uu][Ss][Tt][Ff][Ii][Rr][Ss][Tt]*) return 0 ;;
    *) return 1 ;;
  esac
}

old_runtime_uses_deploy_path() {
  case "$OLD_PM2_CWD" in
    "$DEPLOY_PATH"|"$DEPLOY_PATH"/*) return 0 ;;
    *) return 1 ;;
  esac
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

cleanup_staging() {
  case "$RELEASE_DIR" in
    "$DEPLOY_ROOT"/releases/*) rm -rf "$RELEASE_DIR" ;;
    *) log "Refusing unsafe release cleanup path: $RELEASE_DIR" ;;
  esac

  case "$BACKUP_DIR" in
    "$DEPLOY_ROOT"/backups/*) rm -rf "$BACKUP_DIR" ;;
    *) log "Refusing unsafe backup cleanup path: $BACKUP_DIR" ;;
  esac
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

resolve_pm2_mapping() {
  local ancestors="$1"
  local listener_cwd="$2"

  pm2 jlist | node -e '
    const fs = require("fs");
    const ancestors = new Set((process.argv[1] || "").split(",").filter(Boolean));
    const listenerCwd = process.argv[2] || "";
    const list = JSON.parse(fs.readFileSync(0, "utf8"));
    const safe = (value) => value === "/var/www/trustfirst-client-portal" || value.startsWith("/var/www/trustfirst-client-portal/") || value.startsWith("/var/www/trustfirst-client-portal-releases/");
    const eligible = (item) => {
      const env = item.pm2_env || {};
      const name = String(item.name || env.name || "");
      const cwd = String(env.pm_cwd || "");
      return safe(cwd) && !/cafeluxe/i.test(name + cwd);
    };
    let matches = list.filter((item) => eligible(item) && ancestors.has(String(item.pid)));
    if (matches.length === 0) {
      matches = list.filter((item) => {
        if (!eligible(item)) return false;
        const cwd = String((item.pm2_env || {}).pm_cwd || "");
        return listenerCwd === cwd || listenerCwd.startsWith(cwd + "/");
      });
    }
    if (matches.length !== 1) process.exit(2);
    const item = matches[0];
    process.stdout.write(`${item.pm_id}\t${item.name}\t${(item.pm2_env || {}).pm_cwd || ""}`);
  ' "$ancestors" "$listener_cwd"
}

resolve_unique_online_trustfirst_process() {
  pm2 jlist | node -e '
    const fs = require("fs");
    const list = JSON.parse(fs.readFileSync(0, "utf8"));
    const safe = (value) => value === "/var/www/trustfirst-client-portal" || value.startsWith("/var/www/trustfirst-client-portal/") || value.startsWith("/var/www/trustfirst-client-portal-releases/");
    const matches = list.filter((item) => {
      const env = item.pm2_env || {};
      const name = String(item.name || env.name || "");
      const cwd = String(env.pm_cwd || "");
      const trustfirstNamed = /^trustfirst/i.test(name);
      return env.status === "online" && !/cafeluxe/i.test(name + cwd) && (safe(cwd) || trustfirstNamed);
    });
    if (matches.length !== 1) process.exit(2);
    const item = matches[0];
    process.stdout.write(`${item.pm_id}\t${item.name}\t${(item.pm2_env || {}).pm_cwd || ""}`);
  '
}

resolve_stopped_canonical_process() {
  pm2 jlist | node -e '
    const fs = require("fs");
    const target = process.argv[1] || "";
    const list = JSON.parse(fs.readFileSync(0, "utf8"));
    const safe = (value) => value === "/var/www/trustfirst-client-portal" || value.startsWith("/var/www/trustfirst-client-portal/") || value.startsWith("/var/www/trustfirst-client-portal-releases/");
    const matches = list.filter((item) => {
      const env = item.pm2_env || {};
      const name = String(item.name || env.name || "");
      const cwd = String(env.pm_cwd || "");
      return name === target && safe(cwd) && !/cafeluxe/i.test(name + cwd);
    });
    if (matches.length > 1) process.exit(2);
    if (matches.length === 1) {
      const item = matches[0];
      process.stdout.write(`${item.pm_id}\t${item.name}\t${(item.pm2_env || {}).pm_cwd || ""}`);
    }
  ' "$PM2_APP_NAME"
}

validate_old_pm2_mapping() {
  [ -n "$OLD_PM2_ID" ] || fail "Existing TrustFirst PM2 id was empty."
  case "$OLD_PM2_NAME:$OLD_PM2_CWD" in
    *[Cc]afe[Ll]uxe*) fail "Existing production process unexpectedly references CafeLuxe." ;;
  esac
  if ! safe_trustfirst_path "$OLD_PM2_CWD"; then
    trustfirst_process_name "$OLD_PM2_NAME" \
      || fail "Existing PM2 process is neither TrustFirst-named nor in an approved TrustFirst path."
    log "Accepting TrustFirst-named PM2 wrapper with external cwd: $OLD_PM2_CWD"
  fi
}

resolve_existing_runtime() {
  local listener_line listener_pid listener_cwd listener_cmd
  local ancestors current_pid mapping

  listener_line="$(ss -ltnp 2>/dev/null | grep -E "[:.]${PRODUCTION_PORT}[[:space:]]" | head -n 1 || true)"

  if [ -z "$listener_line" ]; then
    mapping="$(resolve_stopped_canonical_process)" || fail "Canonical PM2 process lookup was ambiguous."
    if [ -n "$mapping" ]; then
      IFS=$'\t' read -r OLD_PM2_ID OLD_PM2_NAME OLD_PM2_CWD <<< "$mapping"
      validate_old_pm2_mapping
      log "Found stopped canonical TrustFirst PM2 process id=$OLD_PM2_ID."
    else
      log "No existing TrustFirst production listener was found; this is a first start."
    fi
    return 0
  fi

  listener_pid="$(printf '%s\n' "$listener_line" | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -n 1)"
  if [ -z "$listener_pid" ]; then
    mapping="$(resolve_unique_online_trustfirst_process)" \
      || fail "Socket PID is hidden and exactly one online TrustFirst PM2 process was not found."
    [ -n "$mapping" ] || fail "Socket PID is hidden and TrustFirst PM2 mapping was empty."
    canonical_loopback_health "$PRODUCTION_PORT" \
      || fail "Existing TrustFirst canonical loopback health check failed."
    IFS=$'\t' read -r OLD_PM2_ID OLD_PM2_NAME OLD_PM2_CWD <<< "$mapping"
    validate_old_pm2_mapping
    log "Existing TrustFirst runtime identified without socket PID: pm2_id=$OLD_PM2_ID name=$OLD_PM2_NAME cwd=$OLD_PM2_CWD"
    return 0
  fi

  listener_cwd="$(readlink -f "/proc/$listener_pid/cwd" 2>/dev/null || true)"
  safe_trustfirst_path "$listener_cwd" || fail "Production port $PRODUCTION_PORT listener is outside TrustFirst: $listener_cwd"

  listener_cmd="$(tr '\0' ' ' < "/proc/$listener_pid/cmdline" 2>/dev/null || true)"
  case "$listener_cmd" in
    *next-server*|*node*) ;;
    *) fail "Production port $PRODUCTION_PORT has an unexpected listener command." ;;
  esac

  ancestors=""
  current_pid="$listener_pid"
  while [ -n "$current_pid" ] && [ "$current_pid" -gt 1 ] 2>/dev/null; do
    ancestors="${ancestors}${ancestors:+,}${current_pid}"
    current_pid="$(ps -o ppid= -p "$current_pid" 2>/dev/null | tr -d ' ' || true)"
  done

  mapping="$(resolve_pm2_mapping "$ancestors" "$listener_cwd")" \
    || fail "Existing TrustFirst listener could not be mapped to exactly one safe PM2 process."
  [ -n "$mapping" ] || fail "Existing TrustFirst PM2 mapping was empty."

  IFS=$'\t' read -r OLD_PM2_ID OLD_PM2_NAME OLD_PM2_CWD <<< "$mapping"
  validate_old_pm2_mapping
  log "Existing TrustFirst runtime identified: pm2_id=$OLD_PM2_ID name=$OLD_PM2_NAME cwd=$OLD_PM2_CWD"
}

stop_existing_runtime_for_switch() {
  if [ -z "$OLD_PM2_ID" ]; then
    pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true
    return 0
  fi

  if [ "$OLD_PM2_NAME" != "$PM2_APP_NAME" ]; then
    log "Stopping and retaining existing TrustFirst PM2 process id=$OLD_PM2_ID for rollback."
    OLD_PM2_RETAINED=1
    pm2 stop "$OLD_PM2_ID"
  else
    log "Deleting existing canonical TrustFirst PM2 process id=$OLD_PM2_ID; file backup will provide rollback."
    pm2 delete "$OLD_PM2_ID"
    OLD_PM2_RETAINED=0
  fi

  local port_free=0
  for attempt in $(seq 1 30); do
    if ! ss -ltn 2>/dev/null | grep -Eq "[:.]${PRODUCTION_PORT}[[:space:]]"; then
      port_free=1
      break
    fi
    sleep 1
  done
  [ "$port_free" = "1" ] || fail "Production port $PRODUCTION_PORT did not become free after stopping TrustFirst."
}

finalize_old_runtime() {
  if [ "$OLD_PM2_RETAINED" = "1" ] && [ -n "$OLD_PM2_ID" ]; then
    log "Deleting retained previous TrustFirst PM2 process id=$OLD_PM2_ID after successful verification."
    pm2 delete "$OLD_PM2_ID" >/dev/null 2>&1 || true
    OLD_PM2_RETAINED=0
  fi
}

restore_previous_release() {
  local reason="$1"
  local original_status="${2:-1}"
  local rollback_started=0

  if [ "$RESTORING" = "1" ]; then
    log "Rollback re-entry blocked. Manual recovery may be required."
    cleanup_staging
    exit "$original_status"
  fi

  RESTORING=1
  trap - ERR
  set +e
  log "Production verification failed: $reason"
  cleanup_canary
  pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true

  if [ "$SWITCHED" = "1" ]; then
    if [ "$OLD_PM2_RETAINED" = "1" ] && [ -n "$OLD_PM2_ID" ] && \
       ! old_runtime_uses_deploy_path && pm2 describe "$OLD_PM2_ID" >/dev/null 2>&1; then
      log "Restarting retained external TrustFirst PM2 process id=$OLD_PM2_ID."
      pm2 restart "$OLD_PM2_ID"
      rollback_started=1
    elif [ -d "$BACKUP_DIR" ]; then
      log "Restoring previous TrustFirst application files."
      find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
      copy_tree "$BACKUP_DIR" "$DEPLOY_PATH"

      if [ "$OLD_PM2_RETAINED" = "1" ] && [ -n "$OLD_PM2_ID" ] && \
         pm2 describe "$OLD_PM2_ID" >/dev/null 2>&1; then
        log "Restarting retained previous TrustFirst PM2 process id=$OLD_PM2_ID."
        pm2 restart "$OLD_PM2_ID"
      else
        log "Starting restored canonical TrustFirst release."
        start_production
      fi
      rollback_started=1
    else
      log "No rollback file copy exists and no retained external TrustFirst runtime is available."
    fi

    if [ "$rollback_started" = "1" ]; then
      local restored=0
      for attempt in $(seq 1 45); do
        if canonical_loopback_health "$PRODUCTION_PORT" >/dev/null 2>&1; then
          restored=1
          break
        fi
        sleep 1
      done

      if [ "$restored" = "1" ]; then
        log "Previous TrustFirst release restored successfully."
      else
        log "Rollback actions completed, but runtime health verification failed."
      fi
    fi
  else
    log "Production was not switched; existing release remains unchanged."
  fi

  cleanup_staging
  exit "$original_status"
}

fail() {
  local message="$1"
  log "ERROR: $message"
  if [ "$SWITCHED" = "1" ]; then
    restore_previous_release "$message" 1
  fi
  cleanup_staging
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
[ -r "$ENV_FILE" ] || fail "Production environment file is not readable: $ENV_FILE"
[ -f "$DEPLOY_ARCHIVE" ] || fail "Missing uploaded release archive: $DEPLOY_ARCHIVE"
[ -d "$DEPLOY_PATH" ] || fail "Existing TrustFirst application directory is missing: $DEPLOY_PATH"

if [ ! -w "$DEPLOY_PATH" ]; then
  command -v sudo >/dev/null 2>&1 || fail "Deploy user cannot write to $DEPLOY_PATH and sudo is unavailable."
  sudo -n true >/dev/null 2>&1 || fail "Deploy user cannot write to $DEPLOY_PATH and passwordless sudo is unavailable."
  log "Repairing ownership of the isolated TrustFirst application directory."
  need_sudo chown -R "$(id -un):$(id -gn)" "$DEPLOY_PATH"
fi
[ -w "$DEPLOY_PATH" ] || fail "Deploy user still cannot write to $DEPLOY_PATH after ownership repair."

command -v node >/dev/null 2>&1 || fail "Node.js is not installed."
command -v npm >/dev/null 2>&1 || fail "npm is not installed."
command -v pm2 >/dev/null 2>&1 || fail "PM2 is not installed."
command -v curl >/dev/null 2>&1 || fail "curl is not installed."
command -v tar >/dev/null 2>&1 || fail "tar is not installed."
command -v ss >/dev/null 2>&1 || fail "ss is not installed."
command -v ps >/dev/null 2>&1 || fail "ps is not installed."

case "$DEPLOY_PATH:$PM2_APP_NAME:$ENV_FILE" in
  *[Cc]afe[Ll]uxe*|*[Cc]afe[Ll]uxesite*) fail "TrustFirst deployment target references CafeLuxe." ;;
esac

CAFE_BEFORE="$(ss -ltnp 2>/dev/null | grep -E '[:.]3000[[:space:]]' || true)"
log "CafeLuxe port 3000 snapshot captured."

resolve_existing_runtime

if ss -ltn 2>/dev/null | grep -Eq "[:.]${CANARY_PORT}[[:space:]]"; then
  if pm2 describe "$CANARY_NAME" >/dev/null 2>&1; then
    cleanup_canary
  else
    fail "Canary port $CANARY_PORT is occupied by an unrelated process."
  fi
fi

rm -rf "$RELEASE_DIR" "$BACKUP_DIR"
mkdir -p "$RELEASE_DIR"
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
  if canonical_loopback_health "$CANARY_PORT" >/dev/null 2>&1; then
    CANARY_READY=1
    break
  fi
  sleep 1
done
[ "$CANARY_READY" = "1" ] || fail "Canary did not become healthy. Production remains unchanged."
log "Canary health check passed."
cleanup_canary

if [ -n "$OLD_PM2_ID" ] && old_runtime_uses_deploy_path; then
  log "Creating rollback copy for the existing TrustFirst runtime in the deployment path."
  mkdir -p "$BACKUP_DIR"
  (cd "$DEPLOY_PATH" && tar --exclude='./storage' -cf - .) | (cd "$BACKUP_DIR" && tar -xf -)
else
  log "Retaining the existing external TrustFirst runtime for rollback; duplicate file copy skipped."
fi

SWITCHED=1
stop_existing_runtime_for_switch

log "Switching TrustFirst application files in place."
find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
copy_tree "$RELEASE_DIR" "$DEPLOY_PATH"

log "Starting only $PM2_APP_NAME on port $PRODUCTION_PORT."
start_production

PRODUCTION_READY=0
for attempt in $(seq 1 45); do
  if canonical_loopback_health "$PRODUCTION_PORT" >/dev/null 2>&1; then
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
finalize_old_runtime
cleanup_staging
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
