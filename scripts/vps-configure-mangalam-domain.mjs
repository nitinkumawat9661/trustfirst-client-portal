import fs from "node:fs";
import path from "node:path";
import {
  loadDeployConfig,
  repoRoot,
  runSsh,
  shellQuote,
  validateDeployConfig,
} from "./vps-utils.mjs";

const canonicalDomain = "mangalamsanitary.in";
const wwwDomain = `www.${canonicalDomain}`;
const expectedIp = "45.10.21.141";
const config = loadDeployConfig();
validateDeployConfig(config);

if (config.DEPLOY_DOMAIN !== canonicalDomain) {
  throw new Error(`DEPLOY_DOMAIN must be exactly ${canonicalDomain}.`);
}

const remote = `
set -euo pipefail
DOMAIN=${shellQuote(canonicalDomain)}
WWW_DOMAIN=${shellQuote(wwwDomain)}
EXPECTED_IP=${shellQuote(expectedIp)}
ENV_FILE=${shellQuote(config.DEPLOY_ENV_FILE)}
APP_PORT=${shellQuote(config.DEPLOY_APP_PORT)}
PM2_PROCESS=${shellQuote(config.DEPLOY_PM2_PROCESS)}
SITE_AVAILABLE="/etc/nginx/sites-available/$DOMAIN"
SITE_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
CAFE_SITE="/etc/nginx/sites-available/cafeluxe"

resolve_ipv4() {
  getent ahostsv4 "$1" | awk '{print $1}' | sort -u
}

if ! resolve_ipv4 "$DOMAIN" | grep -Fxq "$EXPECTED_IP"; then
  echo "Canonical domain does not resolve to the authorized VPS." >&2
  exit 1
fi
if ! resolve_ipv4 "$WWW_DOMAIN" | grep -Fxq "$EXPECTED_IP"; then
  echo "WWW domain does not resolve to the authorized VPS." >&2
  exit 1
fi

CAFE_HASH_BEFORE="$(sudo sha256sum "$CAFE_SITE" | awk '{print $1}')"

sudo tee "$SITE_AVAILABLE" >/dev/null <<NGINX_HTTP
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN $WWW_DOMAIN;

  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \\$host;
    proxy_set_header X-Real-IP \\$remote_addr;
    proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \\$scheme;
    proxy_set_header Upgrade \\$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
  }
}
NGINX_HTTP

sudo ln -sfn "$SITE_AVAILABLE" "$SITE_ENABLED"
sudo nginx -t
sudo systemctl reload nginx
sleep 2

HTTP_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:80:127.0.0.1" "http://$DOMAIN/")"
if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "302" ] && [ "$HTTP_STATUS" != "307" ] && [ "$HTTP_STATUS" != "308" ]; then
  echo "Domain HTTP probe failed before certificate issuance." >&2
  exit 1
fi

sudo certbot certonly --nginx --non-interactive --agree-tos --register-unsafely-without-email \
  --cert-name "$DOMAIN" -d "$DOMAIN" -d "$WWW_DOMAIN"

if ! sudo test -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" || ! sudo test -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem"; then
  echo "Certificate files were not created." >&2
  exit 1
fi

sudo tee "$SITE_AVAILABLE" >/dev/null <<NGINX_TLS
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN $WWW_DOMAIN;
  return 301 https://$DOMAIN\\$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name $WWW_DOMAIN;

  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  return 301 https://$DOMAIN\\$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name $DOMAIN;

  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \\$host;
    proxy_set_header X-Real-IP \\$remote_addr;
    proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade \\$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
  }
}
NGINX_TLS

sudo nginx -t
sudo systemctl reload nginx

TMP_ENV="$(mktemp)"
sudo awk '
  !/^AUTH_URL=/ &&
  !/^NEXTAUTH_URL=/ &&
  !/^TRUSTFIRST_HTTP_STAGING_LOGIN=/ &&
  !/^TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS=/
' "$ENV_FILE" > "$TMP_ENV"
printf 'AUTH_URL=https://%s\\nNEXTAUTH_URL=https://%s\\n' "$DOMAIN" "$DOMAIN" >> "$TMP_ENV"
sudo install -o root -g trustfirst -m 640 "$TMP_ENV" "$ENV_FILE"
rm -f "$TMP_ENV"

sudo -iu trustfirst pm2 restart "$PM2_PROCESS" --update-env >/dev/null
sudo -iu trustfirst pm2 save >/dev/null

if sudo ufw status | grep -Eq '3010/tcp[[:space:]]+ALLOW'; then
  sudo ufw --force delete allow 3010/tcp >/dev/null
fi

CAFE_HASH_AFTER="$(sudo sha256sum "$CAFE_SITE" | awk '{print $1}')"
if [ "$CAFE_HASH_BEFORE" != "$CAFE_HASH_AFTER" ]; then
  echo "CafeLuxe Nginx fingerprint changed; manual investigation required." >&2
  exit 1
fi

sleep 3
HTTPS_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "https://$DOMAIN/api/auth/session")"
INTAKE_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "https://$DOMAIN/intake/manglam-trading-demo")"
ADMIN_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "https://$DOMAIN/admin")"

printf '__DNS__=verified\\n'
printf '__SITE__=%s\\n' "$SITE_AVAILABLE"
printf '__CERTIFICATE__=issued\\n'
printf '__HTTPS_STATUS__=%s\\n' "$HTTPS_STATUS"
printf '__INTAKE_STATUS__=%s\\n' "$INTAKE_STATUS"
printf '__ADMIN_STATUS__=%s\\n' "$ADMIN_STATUS"
printf '__AUTH_URL__=https\\n'
printf '__HTTP_GATES__=removed\\n'
printf '__PORT_3010_UFW__=closed\\n'
printf '__CAFE_HASH__=%s\\n' "$CAFE_HASH_AFTER"
printf '__CAFE_UNTOUCHED__=yes\\n'
`;

const result = runSsh(config, `bash -lc ${shellQuote(remote)}`);
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Mangalam domain configuration failed.\n");
  process.exit(result.status ?? 1);
}

const markers = parseMarkers(result.stdout);
for (const [key, expected] of [
  ["__DNS__", "verified"],
  ["__CERTIFICATE__", "issued"],
  ["__HTTPS_STATUS__", "200"],
  ["__INTAKE_STATUS__", "200"],
  ["__AUTH_URL__", "https"],
  ["__HTTP_GATES__", "removed"],
  ["__PORT_3010_UFW__", "closed"],
  ["__CAFE_UNTOUCHED__", "yes"],
]) {
  if (markers[key] !== expected) throw new Error(`${key} expected ${expected}, received ${markers[key] ?? "missing"}.`);
}
if (![301, 302, 303, 307, 308].includes(Number(markers.__ADMIN_STATUS__))) {
  throw new Error(`Anonymous admin route was not redirected: ${markers.__ADMIN_STATUS__}.`);
}

const report = `# Mangalam Production Domain

## Production Entry

- Canonical URL: https://${canonicalDomain}
- WWW behavior: redirects to the canonical domain
- DNS: verified to ${expectedIp}
- Nginx site: \`${markers.__SITE__}\`
- TLS certificate: issued for both hostnames
- TrustFirst upstream: \`127.0.0.1:3010\`
- Public intake status: HTTP ${markers.__INTAKE_STATUS__}
- Anonymous admin status: HTTP ${markers.__ADMIN_STATUS__} redirect

## Authentication And Network

- \`AUTH_URL\` and \`NEXTAUTH_URL\`: HTTPS canonical origin
- Temporary HTTP staging login gate: removed
- Temporary HTTP staging auth bypass: removed
- Public UFW allowance for 3010/tcp: removed
- Secure-cookie behavior: restored by HTTPS production configuration

## Shared VPS Isolation

- Separate site file: yes
- CafeLuxe site modified: no
- CafeLuxe Nginx SHA-256 after configuration: \`${markers.__CAFE_HASH__}\`
- CafeLuxe port 3000, files, database, PM2 process, and secrets: untouched
`;
fs.writeFileSync(path.join(repoRoot, "MANGALAM_PRODUCTION_DOMAIN.md"), report, "utf8");

console.log(`Mangalam production domain configured at https://${canonicalDomain}.`);
console.log("Temporary HTTP auth gates removed; CafeLuxe Nginx fingerprint unchanged.");

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
