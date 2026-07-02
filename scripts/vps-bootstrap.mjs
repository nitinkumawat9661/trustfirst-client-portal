import {
  assertNoHostKeyMismatch,
  deploymentUrl,
  expectedSharedVps,
  hasHostKeyMismatch,
  loadDeployConfig,
  runSsh,
  shellQuote,
  validateDeployConfig,
  writeHostKeyBlockerReport,
} from "./vps-utils.mjs";

const config = loadDeployConfig();
validateDeployConfig(config);

const remote = `
set -euo pipefail
APP_DIR=${shellQuote(config.DEPLOY_APP_DIR)}
ENV_FILE=${shellQuote(config.DEPLOY_ENV_FILE)}
APP_PORT=${shellQuote(config.DEPLOY_APP_PORT)}
PM2_PROCESS=${shellQuote(config.DEPLOY_PM2_PROCESS)}
AUTH_URL=${shellQuote(deploymentUrl(config))}
UPLOAD_DIR="$APP_DIR/storage/uploads"
DB_NAME=${shellQuote(expectedSharedVps.dbName)}
DB_USER=${shellQuote(expectedSharedVps.dbUser)}

need_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

psql_as_postgres() {
  if [ "$(id -u)" -eq 0 ]; then
    runuser -u postgres -- psql "$@"
  else
    sudo -u postgres psql "$@"
  fi
}

install_base_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    need_sudo apt-get update
    need_sudo apt-get install -y ca-certificates curl git build-essential postgresql postgresql-contrib nginx
  else
    echo "apt-get is not available; install Node.js, npm, PostgreSQL, Git, and Nginx/Caddy manually." >&2
    exit 1
  fi
}

version_major() {
  printf "%s" "$1" | sed -E 's/^v?([0-9]+).*/\\1/'
}

assert_isolated_target() {
  case "$APP_DIR:$ENV_FILE:$PM2_PROCESS" in
    *[Cc]afe[Ll]uxe*|*[Cc]afe[Ll]uxesite*)
      echo "Refusing to use CafeLuxe paths, env files, or PM2 process names." >&2
      exit 1
      ;;
  esac
  if [ "$APP_DIR" != "/var/www/trustfirst-client-portal" ] || [ "$ENV_FILE" != "/etc/trustfirst-client-portal.env" ]; then
    echo "Refusing non-isolated TrustFirst app/env paths." >&2
    exit 1
  fi
  if [ "$APP_PORT" != "3010" ]; then
    echo "Refusing app port $APP_PORT; shared old VPS deployment must use 3010." >&2
    exit 1
  fi
  if [ "$DB_NAME" != "trustfirst_demo" ] || [ "$DB_USER" != "trustfirst_demo" ]; then
    echo "Refusing database/user outside trustfirst_demo." >&2
    exit 1
  fi
  if command -v pm2 >/dev/null 2>&1 && pm2 jlist 2>/dev/null | grep -qi '"name":"cafeluxe"'; then
    if [ "$PM2_PROCESS" = "cafeluxe" ] || [ "$PM2_PROCESS" = "cafeluxesite" ]; then
      echo "Refusing PM2 process conflict with CafeLuxe." >&2
      exit 1
    fi
  fi
  if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null || true) | grep -Eq "[:.]$APP_PORT[[:space:]]"; then
    if command -v pm2 >/dev/null 2>&1 && pm2 jlist 2>/dev/null | grep -q "\"name\":\"$PM2_PROCESS\""; then
      echo "Port $APP_PORT is already used by the TrustFirst PM2 process; continuing for idempotent bootstrap."
    else
      echo "Refusing deployment because port $APP_PORT is already used by another service." >&2
      exit 1
    fi
  fi
}

assert_isolated_target

install_base_packages

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then NODE_MAJOR=$(version_major "$(node -v)"); fi
if [ "$NODE_MAJOR" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | need_sudo -E bash -
  need_sudo apt-get install -y nodejs
fi

NPM_MAJOR=0
if command -v npm >/dev/null 2>&1; then NPM_MAJOR=$(version_major "$(npm -v)"); fi
if [ "$NPM_MAJOR" -lt 10 ]; then
  need_sudo npm install -g npm@10
fi

if ! command -v pm2 >/dev/null 2>&1; then
  need_sudo npm install -g pm2
fi

need_sudo mkdir -p "$APP_DIR" "$UPLOAD_DIR"
need_sudo chown -R "$(id -un):$(id -gn)" "$APP_DIR"
chmod 750 "$UPLOAD_DIR"

DB_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))")"
AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
DEMO_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")"

psql_as_postgres -v ON_ERROR_STOP=1 <<SQL
DO \\$\\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE trustfirst_demo LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE trustfirst_demo WITH LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END
\\$\\$;
SELECT 'CREATE DATABASE trustfirst_demo OWNER trustfirst_demo'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'trustfirst_demo')\\gexec
GRANT ALL PRIVILEGES ON DATABASE trustfirst_demo TO trustfirst_demo;
SQL

need_sudo install -m 600 -o "$(id -un)" -g "$(id -gn)" /dev/null "$ENV_FILE"
cat > "$ENV_FILE" <<EOF
DATABASE_URL="postgresql://trustfirst_demo:$DB_PASSWORD@127.0.0.1:5432/trustfirst_demo?schema=public"
AUTH_SECRET="$AUTH_SECRET"
AUTH_URL="$AUTH_URL"
NEXTAUTH_URL="$AUTH_URL"
NODE_ENV="production"
STORAGE_DRIVER="local"
UPLOAD_DIR="$UPLOAD_DIR"
MANGLAM_DEMO_ADMIN_EMAIL="manglam-demo-admin@trustfirst.example.com"
MANGLAM_DEMO_ADMIN_PASSWORD="$DEMO_PASSWORD"
EOF
chmod 600 "$ENV_FILE"

echo "VPS bootstrap completed without printing secrets."
node -v
npm -v
psql --version
git --version
`;

const result = runSsh(config, `bash -lc ${shellQuote(remote)}`, { stdio: "pipe" });
if (hasHostKeyMismatch(result)) {
  writeHostKeyBlockerReport(config, `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  assertNoHostKeyMismatch(result);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "VPS bootstrap failed.\n");
  process.exit(result.status ?? 1);
}

process.stdout.write(result.stdout);
