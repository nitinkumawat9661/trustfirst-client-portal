import fs from "node:fs";

const deployPath = "scripts/deploy-production-ci.sh";
const workflowPath = ".github/workflows/deploy-mangalam-production.yml";

let deploy = fs.readFileSync(deployPath, "utf8");
let workflow = fs.readFileSync(workflowPath, "utf8");

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first === -1 || first !== last) {
    throw new Error(`${label}: expected exactly one match`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceCount(source, before, after, expected, label) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} matches, found ${count}`);
  }
  return source.split(before).join(after);
}

deploy = replaceOnce(
  deploy,
  `log() {\n  printf '[trustfirst-deploy] %s\\n' "$*"\n}\n\nneed_sudo() {`,
  `log() {\n  printf '[trustfirst-deploy] %s\\n' "$*"\n}\n\napply_canonical_auth_env() {\n  [ "$PRODUCTION_URL" = "https://app.mangalamsanitary.in" ] \\\n    || fail "Unexpected production auth URL: $PRODUCTION_URL"\n  export AUTH_TRUST_HOST="true"\n  export AUTH_URL="$PRODUCTION_URL"\n  export NEXTAUTH_URL="$PRODUCTION_URL"\n  unset TRUSTFIRST_ALLOW_LOOPBACK_STAGING\n  if [ "\${TRUSTFIRST_DEMO_MODE:-}" = "staging" ]; then\n    unset TRUSTFIRST_DEMO_MODE\n  fi\n}\n\nneed_sudo() {`,
  "insert canonical auth environment helper",
);

deploy = replaceOnce(
  deploy,
  `  . "$ENV_FILE"\n  set +a\n  PORT="$PRODUCTION_PORT" pm2 start npm \\`,
  `  . "$ENV_FILE"\n  set +a\n  apply_canonical_auth_env\n  PORT="$PRODUCTION_PORT" pm2 start npm \\`,
  "apply canonical auth environment to production runtime",
);

deploy = replaceOnce(
  deploy,
  `. "$ENV_FILE"\nset +a\n\ncase "\${DATABASE_URL:-}" in`,
  `. "$ENV_FILE"\nset +a\napply_canonical_auth_env\n\ncase "\${DATABASE_URL:-}" in`,
  "apply canonical auth environment before validation and build",
);

deploy = replaceOnce(
  deploy,
  `[ "$CANARY_PORT" != "3000" ] || fail "CafeLuxe port 3000 is forbidden."\n[ -f "$ENV_FILE" ]`,
  `[ "$CANARY_PORT" != "3000" ] || fail "CafeLuxe port 3000 is forbidden."\n[ "$PRODUCTION_URL" = "https://app.mangalamsanitary.in" ] || fail "Unexpected production URL: $PRODUCTION_URL"\n[ "$PUBLIC_URL" = "https://mangalamsanitary.in" ] || fail "Unexpected public URL: $PUBLIC_URL"\n[ -f "$ENV_FILE" ]`,
  "enforce canonical deployment URLs",
);

deploy = replaceCount(
  deploy,
  `curl --silent --show-error --fail --max-time 5 "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session"`,
  `curl --silent --show-error --fail --max-time 5 --header "Host: app.mangalamsanitary.in" "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session"`,
  1,
  "harden existing runtime health probe",
);

deploy = replaceCount(
  deploy,
  `curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session"`,
  `curl --silent --show-error --fail --max-time 3 --header "Host: app.mangalamsanitary.in" "http://127.0.0.1:\${PRODUCTION_PORT}/api/auth/session"`,
  2,
  "harden rollback and production health probes",
);

deploy = replaceCount(
  deploy,
  `curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:\${CANARY_PORT}/api/auth/session"`,
  `curl --silent --show-error --fail --max-time 3 --header "Host: app.mangalamsanitary.in" "http://127.0.0.1:\${CANARY_PORT}/api/auth/session"`,
  1,
  "harden canary health probe",
);

workflow = replaceOnce(
  workflow,
  `          [ "$PRODUCTION_PORT" != "3000" ]\n          [ "$CANARY_PORT" != "3000" ]`,
  `          [ "$PRODUCTION_PORT" != "3000" ]\n          [ "$CANARY_PORT" != "3000" ]\n          [ "$PRODUCTION_URL" = "https://app.mangalamsanitary.in" ]\n          [ "$PUBLIC_URL" = "https://mangalamsanitary.in" ]`,
  "validate canonical workflow URLs",
);

workflow = replaceOnce(
  workflow,
  `               curl --silent --show-error --fail --max-time 5 "http://127.0.0.1:\${PROD_PORT}/api/auth/session" >/dev/null || {`,
  `               curl --silent --show-error --fail --max-time 5 --header "Host: app.mangalamsanitary.in" "http://127.0.0.1:\${PROD_PORT}/api/auth/session" >/dev/null || {`,
  "harden workflow preflight health probe",
);

fs.writeFileSync(deployPath, deploy);
fs.writeFileSync(workflowPath, workflow);
