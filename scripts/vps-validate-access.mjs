import {
  assertNoHostKeyMismatch,
  loadDeployConfig,
  runSsh,
  shellQuote,
  validateDeployConfig,
} from "./vps-utils.mjs";

const config = loadDeployConfig();
validateDeployConfig(config);

const probe = `
set -u
echo "__HOSTNAME__=$(hostname)"
echo "__UNAME__=$(uname -srm)"
if [ -f /etc/os-release ]; then . /etc/os-release; echo "__OS__=$PRETTY_NAME"; else echo "__OS__=unknown"; fi
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
`;

const result = runSsh(config, `bash -lc ${shellQuote(probe)}`);
assertNoHostKeyMismatch(result);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "SSH validation failed.\n");
  process.exit(result.status ?? 1);
}

process.stdout.write(result.stdout);
console.log("VPS SSH validation completed. Review missing runtime tools before bootstrap/deploy.");
