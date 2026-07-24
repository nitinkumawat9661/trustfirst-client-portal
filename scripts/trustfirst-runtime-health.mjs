import {
  deploymentUrl,
  loadDeployConfig,
  runSsh,
  shellQuote,
  validateDeployConfig,
} from "./vps-utils.mjs";

const expectedProcess = "trustfirst-client-portal";
const expectedPort = "3010";
const expectedService = "pm2-trustfirst.service";

const config = loadDeployConfig();
validateDeployConfig(config);

if (
  config.DEPLOY_USER !== "trustfirst" ||
  config.DEPLOY_PM2_PROCESS !== expectedProcess ||
  config.DEPLOY_APP_PORT !== expectedPort
) {
  throw new Error("Runtime health target must remain the isolated TrustFirst process on port 3010.");
}

const remoteProbe = `
set -euo pipefail

process_result="$(sudo -iu trustfirst pm2 jlist | /usr/bin/node -e '
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const processes = JSON.parse(input || "[]");
  const target = processes.filter((processInfo) => processInfo.name === "trustfirst-client-portal");
  const unexpected = processes.filter((processInfo) => processInfo.name !== "trustfirst-client-portal");

  if (target.length !== 1 || unexpected.length !== 0) {
    process.exit(10);
  }

  const status = target[0].pm2_env?.status ?? "unknown";
  const autoRestart = target[0].pm2_env?.autorestart !== false;
  process.stdout.write(status + "|" + (autoRestart ? "enabled" : "disabled"));
});
')"

if [ "$process_result" != "online|enabled" ]; then
  echo "TrustFirst PM2 process is not healthy." >&2
  exit 11
fi

if ! sudo ss -H -ltn | awk '$4 == "127.0.0.1:3010" { found = 1 } END { exit found ? 0 : 1 }'; then
  echo "TrustFirst port 3010 is not bound exclusively to 127.0.0.1." >&2
  exit 12
fi

service_enabled="$(sudo systemctl is-enabled pm2-trustfirst.service)"
service_active="$(sudo systemctl is-active pm2-trustfirst.service)"

if [ "$service_enabled" != "enabled" ] || [ "$service_active" != "active" ]; then
  echo "TrustFirst PM2 systemd persistence is not active and enabled." >&2
  exit 13
fi

printf '%s\n' "__PM2_PROCESS__=online"
printf '%s\n' "__PM2_AUTORESTART__=enabled"
printf '%s\n' "__PORT_3010__=loopback-only"
printf '%s\n' "__SYSTEMD_SERVICE__=pm2-trustfirst.service"
printf '%s\n' "__SYSTEMD_ENABLED__=enabled"
printf '%s\n' "__SYSTEMD_ACTIVE__=active"
printf '%s\n' "__ISOLATION__=trustfirst-user-process-and-port-3010-only"
`;

const remoteResult = runSsh(config, `bash -lc ${shellQuote(remoteProbe)}`);
if (remoteResult.status !== 0) {
  process.stderr.write(remoteResult.stderr || remoteResult.stdout || "TrustFirst runtime probe failed.\n");
  process.exit(remoteResult.status ?? 1);
}

const remoteStatus = parseMarkers(remoteResult.stdout);
assertMarker(remoteStatus, "__PM2_PROCESS__", "online");
assertMarker(remoteStatus, "__PM2_AUTORESTART__", "enabled");
assertMarker(remoteStatus, "__PORT_3010__", "listening");
assertMarker(remoteStatus, "__SYSTEMD_SERVICE__", expectedService);
assertMarker(remoteStatus, "__SYSTEMD_ENABLED__", "enabled");
assertMarker(remoteStatus, "__SYSTEMD_ACTIVE__", "active");
assertMarker(remoteStatus, "__ISOLATION__", "trustfirst-user-process-and-port-3010-only");

const baseUrl = deploymentUrl(config).replace(/\/$/, "");
const publicChecks = [
  {
    name: "public intake",
    path: "/intake/manglam-trading-demo",
    validate: (response) => response.status === 200,
  },
  {
    name: "Auth.js session",
    path: "/api/auth/session",
    validate: (response) => response.status === 200,
  },
  {
    name: "anonymous admin lockdown",
    path: "/admin/release-checklist",
    validate: (response) => [301, 302, 303, 307, 308, 401, 403, 404].includes(response.status),
  },
];

for (const check of publicChecks) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url, {
    headers: { "user-agent": "TrustFirst-Runtime-Health/1.0" },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });

  if (!check.validate(response)) {
    throw new Error(`${check.name} returned unexpected HTTP status ${response.status}.`);
  }

  console.log(`PASS ${check.name}: ${response.status}`);
}

console.log(`PASS PM2 process: ${remoteStatus.__PM2_PROCESS__}`);
console.log(`PASS PM2 auto-restart: ${remoteStatus.__PM2_AUTORESTART__}`);
console.log(`PASS port 3010: ${remoteStatus.__PORT_3010__}`);
console.log(`PASS systemd persistence: ${expectedService} active and enabled`);
console.log("PASS CafeLuxe isolation: probe used only the TrustFirst user, process, service, and port 3010");
console.log(`TrustFirst runtime health passed for ${baseUrl}.`);

function parseMarkers(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter((line) => line.startsWith("__") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function assertMarker(status, name, expected) {
  if (status[name] !== expected) {
    throw new Error(`Runtime marker ${name} expected ${expected}, received ${status[name] ?? "missing"}.`);
  }
}
