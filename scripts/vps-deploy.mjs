import {
  assertNoHostKeyMismatch,
  deploymentUrl,
  loadDeployConfig,
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
DEPLOY_DOMAIN=${shellQuote(config.DEPLOY_DOMAIN || "")}
AUTH_URL=${shellQuote(deploymentUrl(config))}
REPO_URL="https://github.com/nitinkumawat9661/trustfirst-client-portal.git"

need_sudo() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE. Run npm run vps:bootstrap first." >&2
  exit 1
fi

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

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
  *trustfirst_demo*|*127.0.0.1*|*localhost*) ;;
  *)
    echo "DATABASE_URL must point to the local trustfirst_demo database." >&2
    exit 1
    ;;
esac

npm ci
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
npm run deploy:migration-check -- --apply
npm run seed:manglam-demo
npm run build

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete trustfirst-client-portal >/dev/null 2>&1 || true
  pm2 start "npm run start --workspace @trustfirst/web" --name trustfirst-client-portal --time --update-env
  pm2 save
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
ExecStart=$(command -v npm) run start --workspace @trustfirst/web
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE
  need_sudo systemctl daemon-reload
  need_sudo systemctl enable trustfirst-client-portal
  need_sudo systemctl restart trustfirst-client-portal
fi

if [ -n "$DEPLOY_DOMAIN" ] && command -v nginx >/dev/null 2>&1; then
  need_sudo tee /etc/nginx/sites-available/trustfirst-client-portal >/dev/null <<NGINX
server {
  listen 80;
  server_name $DEPLOY_DOMAIN;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:3000;
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

SMOKE_BASE_URL="$AUTH_URL" npm run deploy:smoke || SMOKE_BASE_URL="http://127.0.0.1:3000" npm run deploy:smoke
echo "VPS deploy completed."
`;

const result = runSsh(config, `bash -lc ${shellQuote(remote)}`, { stdio: "pipe" });
assertNoHostKeyMismatch(result);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "VPS deploy failed.\n");
  process.exit(result.status ?? 1);
}

process.stdout.write(result.stdout);
