import {
  assertNoHostKeyMismatch,
  hasHostKeyMismatch,
  inspectKnownHost,
  loadDeployConfig,
  runSsh,
  shellQuote,
  validateDeployConfig,
  writeHostKeyBlockerReport,
} from "./vps-utils.mjs";

const config = loadDeployConfig();
validateDeployConfig(config);
const knownHost = inspectKnownHost(config);

console.log(`__KNOWN_HOST__=${knownHost.found ? "present" : "missing"}`);
if (knownHost.output) console.log(knownHost.output);

const probe = `
set -u
echo "__HOSTNAME__=$(hostname)"
echo "__UNAME__=$(uname -srm)"
if [ -f /etc/os-release ]; then . /etc/os-release; echo "__OS__=$PRETTY_NAME"; else echo "__OS__=unknown"; fi
echo "__DISK__=$(df -h / | tail -1)"
echo "__MEMORY__=$(free -h | awk '/^Mem:/ {print $2 " total, " $7 " available"}')"
for cmd in node npm git psql nginx caddy pm2 systemctl; do
  printf "__CMD__%s=" "$cmd"
  if command -v "$cmd" >/dev/null 2>&1; then
    case "$cmd" in
      node) node -v ;;
      npm) npm -v ;;
      git) git --version ;;
      psql) psql --version ;;
      nginx) nginx -v 2>&1 ;;
      caddy) caddy version ;;
      pm2) pm2 -v ;;
      systemctl) systemctl --version | head -1 ;;
    esac
  else
    echo "missing"
  fi
done
echo "__PORTS__"
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || true)
echo "__VAR_WWW__"
ls -la /var/www 2>/dev/null || true
echo "__PM2_LIST__"
(pm2 jlist 2>/dev/null || pm2 list 2>/dev/null || true)
echo "__POSTGRES_DATABASES__"
(psql -Atqc "SELECT datname FROM pg_database ORDER BY datname" postgres 2>/dev/null || sudo -u postgres psql -Atqc "SELECT datname FROM pg_database ORDER BY datname" postgres 2>/dev/null || true)
echo "__NGINX_SITES__"
ls -la /etc/nginx/sites-enabled /etc/nginx/sites-available 2>/dev/null || true
`;

const result = runSsh(config, `bash -lc ${shellQuote(probe)}`);
if (hasHostKeyMismatch(result)) {
  writeHostKeyBlockerReport(config, `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  assertNoHostKeyMismatch(result);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "SSH validation failed.\n");
  process.exit(result.status ?? 1);
}

process.stdout.write(result.stdout);
console.log("VPS SSH validation completed. Review missing runtime tools before bootstrap/deploy.");
