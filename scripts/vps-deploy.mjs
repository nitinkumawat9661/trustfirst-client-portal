import { spawnSync } from "node:child_process";
import {
  assertNoHostKeyMismatch,
  deploymentUrl,
  expectedSharedVps,
  hasHostKeyMismatch,
  loadDeployConfig,
  repoRoot,
  runSsh,
  shellQuote,
  sshBaseArgs,
  validateDeployConfig,
  writeHostKeyBlockerReport,
} from "./vps-utils.mjs";

const config = loadDeployConfig();
validateDeployConfig(config);
const remoteArchive = `/tmp/trustfirst-client-portal-${Date.now()}.tar`;
const commitHash = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});

function failWithResult(message, result) {
  process.stderr.write(`${message}\n${result.stderr?.toString() || result.stdout?.toString() || ""}`);
  process.exit(result.status ?? 1);
}

const archive = spawnSync("git", ["archive", "--format=tar", "HEAD"], {
  cwd: repoRoot,
  encoding: "buffer",
  maxBuffer: 250 * 1024 * 1024,
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});

if (archive.status !== 0 || !archive.stdout?.length) {
  failWithResult("Failed to create a tracked-source deploy archive from local HEAD.", archive);
}

if (commitHash.status !== 0 || !commitHash.stdout.trim()) {
  failWithResult("Failed to resolve local HEAD for deployment summary.", commitHash);
}

const upload = spawnSync("ssh", [...sshBaseArgs(config), `cat > ${shellQuote(remoteArchive)}`], {
  cwd: repoRoot,
  encoding: "buffer",
  input: archive.stdout,
  maxBuffer: 20 * 1024 * 1024,
  shell: false,
  stdio: ["pipe", "pipe", "pipe"],
});

if (hasHostKeyMismatch(upload)) {
  writeHostKeyBlockerReport(config, `${upload.stdout ?? ""}\n${upload.stderr ?? ""}`);
  assertNoHostKeyMismatch(upload);
}

if (upload.status !== 0) {
  failWithResult("Failed to upload the TrustFirst deploy archive over verified SSH.", upload);
}

console.log("archive uploaded: yes");

const remote = `
set -euo pipefail
APP_DIR=${shellQuote(config.DEPLOY_APP_DIR)}
ENV_FILE=${shellQuote(config.DEPLOY_ENV_FILE)}
APP_PORT=${shellQuote(config.DEPLOY_APP_PORT)}
PM2_PROCESS=${shellQuote(config.DEPLOY_PM2_PROCESS)}
DEPLOY_DOMAIN=${shellQuote(config.DEPLOY_DOMAIN || "")}
AUTH_URL=${shellQuote(deploymentUrl(config))}
RELEASE_ARCHIVE=${shellQuote(remoteArchive)}
DEPLOY_COMMIT=${shellQuote(commitHash.stdout.trim())}
DB_NAME=${shellQuote(expectedSharedVps.dbName)}
DB_USER=${shellQuote(expectedSharedVps.dbUser)}

need_sudo() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE. Run npm run vps:bootstrap first." >&2
  exit 1
fi

case "$APP_DIR:$ENV_FILE:$PM2_PROCESS" in
  *[Cc]afe[Ll]uxe*|*[Cc]afe[Ll]uxesite*)
    echo "Refusing to deploy because TrustFirst paths/process point to CafeLuxe." >&2
    exit 1
    ;;
esac
if [ "$APP_DIR" != "/var/www/trustfirst-client-portal" ] || [ "$ENV_FILE" != "/etc/trustfirst-client-portal.env" ]; then
  echo "Refusing non-isolated TrustFirst app/env paths." >&2
  exit 1
fi
if [ "$APP_PORT" != "3010" ] || [ "$DB_NAME" != "trustfirst_demo" ] || [ "$DB_USER" != "trustfirst_demo" ]; then
  echo "Refusing shared VPS deploy with unexpected port, database, or user." >&2
  exit 1
fi
if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null || true) | grep -Eq "[:.]$APP_PORT[[:space:]]"; then
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$PM2_PROCESS" >/dev/null 2>&1; then
    echo "Port $APP_PORT is currently owned by TrustFirst; deploy will restart only $PM2_PROCESS."
  else
    echo "Refusing deployment because port $APP_PORT is already used by another service." >&2
    exit 1
  fi
fi

need_sudo mkdir -p "$APP_DIR"
need_sudo chown -R "$(id -un):$(id -gn)" "$APP_DIR"
if [ ! -f "$RELEASE_ARCHIVE" ]; then
  echo "Missing uploaded TrustFirst release archive." >&2
  exit 1
fi
find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
tar -xf "$RELEASE_ARCHIVE" -C "$APP_DIR"
rm -f "$RELEASE_ARCHIVE"
printf "%s\\n" "$DEPLOY_COMMIT" > "$APP_DIR/.trustfirst-deployed-commit"
echo "remote extract done: yes"

cd "$APP_DIR"
set -a
. "$ENV_FILE"
set +a

case "$DATABASE_URL" in
  *prod*|*production*|*live*)
    echo "Refusing production-like DATABASE_URL." >&2
    exit 1
    ;;
esac
case "$DATABASE_URL" in
  *trustfirst_demo*trustfirst_demo*|*trustfirst_demo*@*trustfirst_demo*) ;;
  *)
    echo "DATABASE_URL must use trustfirst_demo database and trustfirst_demo user." >&2
    exit 1
    ;;
esac
case "$DATABASE_URL" in
  *127.0.0.1*|*localhost*) ;;
  *)
    echo "DATABASE_URL must point to the local trustfirst_demo database." >&2
    exit 1
    ;;
esac

npm ci --include=dev
echo "npm ci done: yes"
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
npm run deploy:migration-check -- --apply
echo "migrations status: applied"
npm run seed:manglam-demo
npm run build
echo "build done: yes"

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete "$PM2_PROCESS" >/dev/null 2>&1 || true
  PORT="$APP_PORT" pm2 start "npm run start --workspace @trustfirst/web" --name "$PM2_PROCESS" --time --update-env
  pm2 save
  echo "PM2 restart done: yes"
else
  SERVICE_FILE="/etc/systemd/system/trustfirst-client-portal.service"
  need_sudo tee "$SERVICE_FILE" >/dev/null <<SERVICE
[Unit]
Description=TrustFirst Client Portal
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
Environment=PORT=$APP_PORT
ExecStart=$(command -v npm) run start --workspace @trustfirst/web
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE
  need_sudo systemctl daemon-reload
  need_sudo systemctl enable trustfirst-client-portal
  need_sudo systemctl restart trustfirst-client-portal
  echo "PM2 restart done: no, systemd restart done: yes"
fi

if [ -n "$DEPLOY_DOMAIN" ] && command -v nginx >/dev/null 2>&1; then
  if [ "$DEPLOY_DOMAIN" = "mangalamsanitary.in" ]; then
    if [ ! -L /etc/nginx/sites-enabled/mangalamsanitary.in ] || [ ! -f /etc/nginx/sites-available/mangalamsanitary.in ]; then
      echo "Dedicated Mangalam Nginx site is missing; refusing to replace it with a generic site." >&2
      exit 1
    fi
    need_sudo nginx -t
  else
    need_sudo tee /etc/nginx/sites-available/trustfirst-client-portal >/dev/null <<NGINX
server {
  listen 80;
  server_name $DEPLOY_DOMAIN;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \\$host;
    proxy_set_header X-Forwarded-Host \\$host;
    proxy_set_header X-Forwarded-Proto \\$scheme;
    proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    proxy_set_header Upgrade \\$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX
    need_sudo ln -sf /etc/nginx/sites-available/trustfirst-client-portal /etc/nginx/sites-enabled/trustfirst-client-portal
    need_sudo nginx -t
    need_sudo systemctl reload nginx
  fi
fi

if SMOKE_BASE_URL="$AUTH_URL" npm run deploy:smoke; then
  SMOKE_TARGET="$AUTH_URL"
elif SMOKE_BASE_URL="http://127.0.0.1:$APP_PORT" npm run deploy:smoke; then
  SMOKE_TARGET="http://127.0.0.1:$APP_PORT"
else
  echo "smoke done: no" >&2
  exit 1
fi
echo "smoke done: yes ($SMOKE_TARGET)"
echo "deployed commit hash: $DEPLOY_COMMIT"
echo "CafeLuxe untouched: yes"
echo "VPS deploy completed."
`;

const result = runSsh(config, `bash -lc ${shellQuote(remote)}`, { stdio: "pipe" });
if (hasHostKeyMismatch(result)) {
  writeHostKeyBlockerReport(config, `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  assertNoHostKeyMismatch(result);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "VPS deploy failed.\n");
  process.exit(result.status ?? 1);
}

process.stdout.write(result.stdout);
