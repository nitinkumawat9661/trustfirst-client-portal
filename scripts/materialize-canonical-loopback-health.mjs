import fs from "node:fs";

// One-time materializer. The pull-request workflow remains until the connector removes it.
const deployPath = "scripts/deploy-production-ci.sh";
const proxyPath = "apps/web/src/proxy.ts";

let deploy = fs.readFileSync(deployPath, "utf8");
let proxy = fs.readFileSync(proxyPath, "utf8");

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing replacement target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Replacement target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const healthFunction = `log() {
  printf '[trustfirst-deploy] %s\\n' "$*"
}

canonical_loopback_health() {
  local port="$1"
  curl --silent --show-error --fail --max-time 3 \\
    --header "Host: app.mangalamsanitary.in" \\
    --header "X-Forwarded-Host: app.mangalamsanitary.in" \\
    --header "X-Forwarded-Proto: https" \\
    --header "X-Forwarded-Port: 443" \\
    "http://127.0.0.1:\${port}/api/auth/session" >/dev/null
}`;

deploy = replaceOnce(
  deploy,
  `log() {
  printf '[trustfirst-deploy] %s\\n' "$*"
}`,
  healthFunction,
  "canonical loopback health function",
);

deploy = replaceOnce(
  deploy,
  `curl --silent --show-error --fail --max-time 5 "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session" >/dev/null \\
      || fail "Existing TrustFirst loopback health check failed."`,
  `canonical_loopback_health "$PRODUCTION_PORT" \\
      || fail "Existing TrustFirst canonical loopback health check failed."`,
  "existing runtime health probe",
);

deploy = replaceOnce(
  deploy,
  `if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session" >/dev/null 2>&1; then
          restored=1`,
  `if canonical_loopback_health "$PRODUCTION_PORT" >/dev/null 2>&1; then
          restored=1`,
  "rollback health probe",
);

deploy = replaceOnce(
  deploy,
  `if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:\${CANARY_PORT}/api/auth/session" >/dev/null 2>&1; then
    CANARY_READY=1`,
  `if canonical_loopback_health "$CANARY_PORT" >/dev/null 2>&1; then
    CANARY_READY=1`,
  "canary health probe",
);

deploy = replaceOnce(
  deploy,
  `if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session" >/dev/null 2>&1; then
    PRODUCTION_READY=1`,
  `if canonical_loopback_health "$PRODUCTION_PORT" >/dev/null 2>&1; then
    PRODUCTION_READY=1`,
  "production health probe",
);

proxy = replaceOnce(
  proxy,
  `import { isDirectLoopbackSessionHealthProbe } from "@/server/security/health-probe";\n`,
  "",
  "health probe import",
);

proxy = replaceOnce(
  proxy,
  `  const isLoopbackHealthProbe = isDirectLoopbackSessionHealthProbe({
    headers: request.headers,
    method: request.method,
    pathname,
  });

`,
  "",
  "health probe evaluation",
);

proxy = replaceOnce(
  proxy,
  `  if (
    process.env.NODE_ENV === "production" &&
    surface === "UNKNOWN" &&
    !isLoopbackHealthProbe
  ) {`,
  `  if (process.env.NODE_ENV === "production" && surface === "UNKNOWN") {`,
  "strict unknown-host boundary",
);

fs.writeFileSync(deployPath, deploy);
fs.writeFileSync(proxyPath, proxy);
fs.rmSync("apps/web/src/server/security/health-probe.ts");
fs.rmSync("apps/web/src/server/security/health-probe.test.ts");
