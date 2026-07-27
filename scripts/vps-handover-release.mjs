import { spawnSync } from "node:child_process";
import {
  assertNoHostKeyMismatch,
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

const commit = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});
if (commit.status !== 0 || !commit.stdout.trim()) {
  process.stderr.write(commit.stderr || "Unable to resolve local HEAD.\n");
  process.exit(commit.status ?? 1);
}

const sha = commit.stdout.trim();
const remoteArchive = `/tmp/trustfirst-handover-${sha}.tar`;
const archive = spawnSync("git", ["archive", "--format=tar", "HEAD"], {
  cwd: repoRoot,
  encoding: "buffer",
  maxBuffer: 250 * 1024 * 1024,
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});
if (archive.status !== 0 || !archive.stdout?.length) {
  process.stderr.write(archive.stderr?.toString() || "Unable to create release archive.\n");
  process.exit(archive.status ?? 1);
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
  process.stderr.write(upload.stderr?.toString() || "Unable to upload release archive.\n");
  process.exit(upload.status ?? 1);
}

const remote = `
set -euo pipefail
SHA=${shellQuote(sha)}
APP_DIR=${shellQuote(config.DEPLOY_APP_DIR)}
ENV_FILE=${shellQuote(config.DEPLOY_ENV_FILE)}
RELEASE_ROOT="/var/www/trustfirst-client-portal-releases"
REL="$RELEASE_ROOT/$SHA"
ARCHIVE=${shellQuote(remoteArchive)}
CANARY="trustfirst-client-portal-canary"
PM2_PROCESS=${shellQuote(config.DEPLOY_PM2_PROCESS)}

if [ "$APP_DIR" != "/var/www/trustfirst-client-portal" ] || [ "$ENV_FILE" != "/etc/trustfirst-client-portal.env" ]; then
  echo "Refusing non-isolated TrustFirst release paths." >&2
  exit 1
fi
need_sudo() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing TrustFirst env file." >&2
  exit 1
fi
need_sudo mkdir -p "$RELEASE_ROOT" "$APP_DIR"
need_sudo chown -R "$(id -un):$(id -gn)" "$RELEASE_ROOT"
rm -rf "$REL"
mkdir -p "$REL"
tar -xf "$ARCHIVE" -C "$REL"
rm -f "$ARCHIVE"
rm -rf "$REL/storage"
ln -s "$APP_DIR/storage" "$REL/storage"

cd "$REL"
set -a
. "$ENV_FILE"
set +a
unset AUTH_URL NEXTAUTH_URL TRUSTFIRST_HTTP_STAGING_LOGIN TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS
export NODE_ENV=production
npm ci --include=dev
npm run deploy:env
npm run db:generate
npm run deploy:migration-check
npm run build

pm2 delete "$CANARY" >/dev/null 2>&1 || true
PORT=3012 pm2 start "npm run start --workspace @trustfirst/web -- --hostname 127.0.0.1" --name "$CANARY" --time --update-env >/dev/null
CANARY_READY=0
for attempt in $(seq 1 40); do
  if curl -fsS -H "Host: app.mangalamsanitary.in" -H "X-Forwarded-Proto: https" http://127.0.0.1:3012/api/auth/session >/dev/null; then
    CANARY_READY=1
    break
  fi
  sleep 1
done
if [ "$CANARY_READY" != "1" ]; then
  echo "Canary did not become ready." >&2
  pm2 logs "$CANARY" --lines 80 --nostream >&2 || true
  exit 1
fi

CANARY_HEADERS="$(mktemp)"
curl -fsS -D "$CANARY_HEADERS" -o /tmp/trustfirst-canary-signin.html -H "Host: app.mangalamsanitary.in" -H "X-Forwarded-Proto: https" http://127.0.0.1:3012/signin
grep -q "MANGALAM SANITARY" /tmp/trustfirst-canary-signin.html
if grep -qi "client.trustfirstsolutions.in" "$CANARY_HEADERS"; then
  echo "Canary sign-in leaked TrustFirst callback." >&2
  cat "$CANARY_HEADERS" >&2
  exit 1
fi
curl -fsS -H "Host: app.mangalamsanitary.in" -H "X-Forwarded-Proto: https" http://127.0.0.1:3012/manifest.webmanifest | grep -q "MANGALAM SANITARY ERP"
curl -fsS -H "Host: app.mangalamsanitary.in" -H "X-Forwarded-Proto: https" http://127.0.0.1:3012/manifest.webmanifest | grep -q "app.mangalamsanitary.in"

TMP_ENV="$(mktemp)"
sudo awk '
  !/^AUTH_URL=/ &&
  !/^NEXTAUTH_URL=/ &&
  !/^TRUSTFIRST_HTTP_STAGING_LOGIN=/ &&
  !/^TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS=/
' "$ENV_FILE" > "$TMP_ENV"
sudo install -o root -g trustfirst -m 640 "$TMP_ENV" "$ENV_FILE"
rm -f "$TMP_ENV"

pm2 delete "$PM2_PROCESS" >/dev/null 2>&1 || true
cd "$REL"
set -a
. "$ENV_FILE"
set +a
unset AUTH_URL NEXTAUTH_URL TRUSTFIRST_HTTP_STAGING_LOGIN TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS
export NODE_ENV=production
PORT=3010 pm2 start "npm run start --workspace @trustfirst/web -- --hostname 127.0.0.1" --name "$PM2_PROCESS" --time --update-env >/dev/null
pm2 save >/dev/null
printf "%s\\n" "$SHA" > "$APP_DIR/.trustfirst-deployed-commit"

PROD_READY=0
for attempt in $(seq 1 40); do
  if curl -fsS -H "Host: app.mangalamsanitary.in" -H "X-Forwarded-Proto: https" http://127.0.0.1:3010/api/auth/session >/dev/null; then
    PROD_READY=1
    break
  fi
  sleep 1
done
if [ "$PROD_READY" != "1" ]; then
  echo "Production did not become ready." >&2
  exit 1
fi

PROD_HEADERS="$(mktemp)"
curl -fsS -D "$PROD_HEADERS" -o /tmp/trustfirst-prod-signin.html -H "Host: app.mangalamsanitary.in" -H "X-Forwarded-Proto: https" http://127.0.0.1:3010/signin
grep -q "MANGALAM SANITARY" /tmp/trustfirst-prod-signin.html
if grep -qi "client.trustfirstsolutions.in" "$PROD_HEADERS"; then
  echo "Production sign-in leaked TrustFirst callback." >&2
  cat "$PROD_HEADERS" >&2
  exit 1
fi
sudo nginx -t >/dev/null
pm2 delete "$CANARY" >/dev/null 2>&1 || true
printf "__RELEASE_DIR__=%s\\n" "$REL"
printf "__DEPLOYED_SHA__=%s\\n" "$SHA"
printf "__CANARY__=passed\\n"
printf "__PRODUCTION__=passed\\n"
printf "__AUTH_URL_REMOVED__=yes\\n"
printf "__CAFE_LUXE_UNTOUCHED__=yes\\n"
`;

const result = runSsh(config, `bash -lc ${shellQuote(remote)}`);
if (hasHostKeyMismatch(result)) {
  writeHostKeyBlockerReport(config, `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  assertNoHostKeyMismatch(result);
}
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Handover release deployment failed.\n");
  process.exit(result.status ?? 1);
}
process.stdout.write(result.stdout);
