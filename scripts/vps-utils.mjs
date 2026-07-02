import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const deployEnvPath = path.join(repoRoot, ".env.deploy.local");
export const reportPath = path.join(repoRoot, "VPS_DEPLOYMENT_REPORT.md");
export const blockerReportPath = path.join(repoRoot, "VPS_BLOCKER_REPORT.md");
export const hostKeyVerificationPath = path.join(repoRoot, "VPS_HOST_KEY_VERIFICATION.md");

const forbiddenHosts = new Set(["45.10.21.141", "cafeluxesite.in", "www.cafeluxesite.in"]);
const confirmationValue = "yes";
export const expectedSharedVps = Object.freeze({
  appDir: "/var/www/trustfirst-client-portal",
  envFile: "/etc/trustfirst-client-portal.env",
  appPort: "3010",
  dbName: "trustfirst_demo",
  dbUser: "trustfirst_demo",
  pm2Process: "trustfirst-client-portal",
});

export function parseEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function loadDeployConfig() {
  if (!fs.existsSync(deployEnvPath)) {
    throw new Error(".env.deploy.local is required. Copy .env.deploy.example and fill authorized TrustFirst/Manglam VPS access.");
  }

  const config = parseEnvFile(deployEnvPath);
  config.DEPLOY_PORT = config.DEPLOY_PORT || "22";
  config.DEPLOY_APP_PORT = config.DEPLOY_APP_PORT || expectedSharedVps.appPort;
  config.DEPLOY_APP_DIR = config.DEPLOY_APP_DIR || expectedSharedVps.appDir;
  config.DEPLOY_ENV_FILE = config.DEPLOY_ENV_FILE || expectedSharedVps.envFile;
  config.DEPLOY_PM2_PROCESS = config.DEPLOY_PM2_PROCESS || expectedSharedVps.pm2Process;
  return config;
}

export function validateDeployConfig(config) {
  const missing = ["DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_KEY_PATH"].filter((key) => !config[key]?.trim());
  if (missing.length > 0) throw new Error(`Missing deployment values: ${missing.join(", ")}`);

  if (config.DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM?.toLowerCase() !== confirmationValue) {
    throw new Error("Set DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes in .env.deploy.local to confirm the target is authorized for TrustFirst/Manglam staging.");
  }

  if (config.DEPLOY_ALLOW_SHARED_OLD_VPS?.toLowerCase() !== confirmationValue) {
    throw new Error("Set DEPLOY_ALLOW_SHARED_OLD_VPS=yes in .env.deploy.local to confirm shared old VPS isolation rules are accepted.");
  }

  if (!hasTrustedHostKeyGate(config)) {
    throw new Error("Set DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=<trusted-fingerprint> or DEPLOY_HOST_KEY_VERIFIED=yes before VPS validation/deployment.");
  }

  const host = config.DEPLOY_HOST.trim().toLowerCase();
  if ((forbiddenHosts.has(host) || host.includes("cafeluxe") || host.includes("cafeluxesite")) && config.DEPLOY_ALLOW_SHARED_OLD_VPS?.toLowerCase() !== confirmationValue) {
    throw new Error("Refusing deployment to a known CafeLuxe host/IP/domain without DEPLOY_ALLOW_SHARED_OLD_VPS=yes.");
  }

  if (!fs.existsSync(resolveKeyPath(config.DEPLOY_KEY_PATH))) {
    throw new Error("DEPLOY_KEY_PATH does not exist.");
  }

  if (!/^\d+$/.test(config.DEPLOY_PORT)) {
    throw new Error("DEPLOY_PORT must be numeric.");
  }

  if (!/^\d+$/.test(config.DEPLOY_APP_PORT)) {
    throw new Error("DEPLOY_APP_PORT must be numeric.");
  }

  const appDir = normalizeRemotePath(config.DEPLOY_APP_DIR);
  const envFile = normalizeRemotePath(config.DEPLOY_ENV_FILE);
  const appPort = String(Number(config.DEPLOY_APP_PORT));
  const pm2Process = config.DEPLOY_PM2_PROCESS.trim();

  if (appDir !== expectedSharedVps.appDir) {
    throw new Error(`DEPLOY_APP_DIR must be ${expectedSharedVps.appDir} for isolated shared VPS deployment.`);
  }

  if (envFile !== expectedSharedVps.envFile) {
    throw new Error(`DEPLOY_ENV_FILE must be ${expectedSharedVps.envFile} and outside the app git directory.`);
  }

  if (appPort !== expectedSharedVps.appPort) {
    throw new Error(`DEPLOY_APP_PORT must be ${expectedSharedVps.appPort} to avoid CafeLuxe port 3000.`);
  }

  if (pm2Process !== expectedSharedVps.pm2Process) {
    throw new Error(`DEPLOY_PM2_PROCESS must be ${expectedSharedVps.pm2Process}.`);
  }

  const lowerAppDir = appDir.toLowerCase();
  const lowerEnvFile = envFile.toLowerCase();
  const lowerPm2 = pm2Process.toLowerCase();
  if (lowerAppDir.includes("cafeluxe") || lowerEnvFile.includes("cafeluxe") || lowerPm2.includes("cafeluxe")) {
    throw new Error("Refusing shared VPS deployment because a TrustFirst path/process points to CafeLuxe.");
  }

  if (config.DEPLOY_APP_DIR.includes(".git") || config.DEPLOY_ENV_FILE.includes(config.DEPLOY_APP_DIR)) {
    throw new Error("Deployment env file must live outside the git app directory.");
  }
}

export function hasTrustedHostKeyGate(config) {
  return Boolean(config.DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256?.trim()) || config.DEPLOY_HOST_KEY_VERIFIED?.toLowerCase() === confirmationValue;
}

export function normalizeFingerprint(value) {
  return String(value ?? "")
    .trim()
    .replace(/^SHA256:/i, "")
    .replace(/\s+/g, "");
}

export function knownHostsTarget(config) {
  return String(config.DEPLOY_PORT || "22") === "22" ? config.DEPLOY_HOST : `[${config.DEPLOY_HOST}]:${config.DEPLOY_PORT}`;
}

function normalizeRemotePath(value) {
  return value.replaceAll("\\", "/").replace(/\/+$/, "");
}

export function resolveKeyPath(keyPath) {
  const expanded = expandEnvironmentPath(keyPath);
  if (expanded.startsWith("~")) return path.join(process.env.USERPROFILE || process.env.HOME || "", expanded.slice(1));
  return path.isAbsolute(expanded) ? expanded : path.resolve(repoRoot, expanded);
}

function expandEnvironmentPath(value) {
  return String(value).replace(/%([^%]+)%/g, (_, name) => process.env[name] ?? `%${name}%`);
}

export function sshBaseArgs(config, options = {}) {
  const strictHostKeyChecking = options.strictHostKeyChecking ?? "yes";
  return [
    "-p",
    config.DEPLOY_PORT,
    "-i",
    resolveKeyPath(config.DEPLOY_KEY_PATH),
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=10",
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    `StrictHostKeyChecking=${strictHostKeyChecking}`,
    `${config.DEPLOY_USER}@${config.DEPLOY_HOST}`,
  ];
}

export function runSsh(config, remoteCommand, options = {}) {
  return spawnSync("ssh", [...sshBaseArgs(config, options), remoteCommand], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: options.stdio ?? "pipe",
  });
}

export function inspectKnownHost(config) {
  const result = spawnSync("ssh-keygen", ["-F", config.DEPLOY_HOST], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "pipe",
  });
  return {
    found: result.status === 0 && Boolean(result.stdout.trim()),
    output: result.stdout.trim() || result.stderr.trim(),
  };
}

export function runLocal(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: options.stdio ?? "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}.`);
  }
  return result;
}

export function assertNoHostKeyMismatch(result) {
  if (hasHostKeyMismatch(result)) {
    throw new Error("SSH host key verification failed or host key mismatch detected. Refusing deployment.");
  }
}

export function hasHostKeyMismatch(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return /REMOTE HOST IDENTIFICATION HAS CHANGED|Host key verification failed/i.test(output);
}

export function writeHostKeyBlockerReport(config, details) {
  const content = `# VPS Blocker Report

## Shared Old VPS Deployment Blocker

- Shared old VPS used: no
- Host: ${maskHost(config?.DEPLOY_HOST)}
- Host-key status: blocked
- App path: ${config?.DEPLOY_APP_DIR ?? expectedSharedVps.appDir}
- Env path: ${config?.DEPLOY_ENV_FILE ?? expectedSharedVps.envFile}
- DB name: ${expectedSharedVps.dbName}
- DB user: ${expectedSharedVps.dbUser}
- App port: ${config?.DEPLOY_APP_PORT ?? expectedSharedVps.appPort}
- PM2 process: ${config?.DEPLOY_PM2_PROCESS ?? expectedSharedVps.pm2Process}
- CafeLuxe untouched: yes
- Migrations applied: no
- Seed completed: no
- Smoke passed: no
- Authenticated QA passed: no
- Final demo readiness: BLOCKED

## Reason

OpenSSH reported a host-key verification failure or host-key mismatch during the read-only validation step. Deployment was not attempted, and \`StrictHostKeyChecking=no\` was not used.

## Safe Manual Verification

Run these commands from the developer machine after confirming the VPS fingerprint out-of-band with the server owner:

\`\`\`bash
ssh-keygen -F ${config?.DEPLOY_HOST ?? "<host>"}
ssh-keygen -R ${config?.DEPLOY_HOST ?? "<host>"}
ssh-keyscan -p ${config?.DEPLOY_PORT ?? "22"} ${config?.DEPLOY_HOST ?? "<host>"} >> ~/.ssh/known_hosts
ssh -p ${config?.DEPLOY_PORT ?? "22"} -i ${config?.DEPLOY_KEY_PATH ?? "<key>"} -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes ${config?.DEPLOY_USER ?? "<user>"}@${config?.DEPLOY_HOST ?? "<host>"} "hostname && uname -a"
\`\`\`

Only rerun deployment after the strict read-only SSH command succeeds and the fingerprint is trusted.

## Raw SSH Output

\`\`\`text
${details || "No SSH output captured."}
\`\`\`
`;
  fs.writeFileSync(blockerReportPath, content, "utf8");
}

export function assertSafeDatabaseUrl(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");
  const lower = databaseUrl.toLowerCase();
  if (/\b(prod|production|live)\b/.test(lower)) {
    throw new Error("Refusing production-like DATABASE_URL.");
  }
  if (!lower.includes(expectedSharedVps.dbName) || !lower.includes(expectedSharedVps.dbUser)) {
    throw new Error("VPS DATABASE_URL must use the trustfirst_demo database and trustfirst_demo user.");
  }
  if (!lower.includes("127.0.0.1") && !lower.includes("localhost")) {
    throw new Error("VPS DATABASE_URL must point to the local trustfirst_demo database.");
  }
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

export function maskHost(host) {
  if (!host) return "not configured";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".");
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  const parts = host.split(".");
  if (parts.length <= 2) return `${host.slice(0, 2)}***`;
  return `${parts[0].slice(0, 2)}***.${parts.slice(1).join(".")}`;
}

export function deploymentUrl(config) {
  if (config.DEPLOY_DOMAIN) return `https://${config.DEPLOY_DOMAIN}`;
  return `http://${config.DEPLOY_HOST}:${config.DEPLOY_APP_PORT || expectedSharedVps.appPort}`;
}

export function writeReport({ config, status }) {
  const content = `# VPS Deployment Report

## Status

${status.summary}

## Deployment Target

- VPS URL: ${status.url ?? "not available"}
- Host: ${maskHost(config?.DEPLOY_HOST)}
- Shared old VPS used: ${status.sharedOldVps ?? "yes"}
- Host-key status: ${status.hostKey ?? "not verified"}
- SSH access status: ${status.ssh ?? "not verified"}
- Server OS: ${status.os ?? "not verified"}
- Node version: ${status.node ?? "not verified"}
- npm version: ${status.npm ?? "not verified"}
- PostgreSQL version: ${status.postgres ?? "not verified"}
- Git version: ${status.git ?? "not verified"}
- Reverse proxy: ${status.proxy ?? "not verified"}
- Domain/subdomain: ${config?.DEPLOY_DOMAIN ? "configured" : "not configured"}

## Environment

- Env configured: ${status.env ?? "no"}
- Env file: ${config?.DEPLOY_ENV_FILE ?? "not configured"}
- Storage status: ${status.storage ?? "not configured"}
- Upload directory: ${config?.DEPLOY_APP_DIR ? `${config.DEPLOY_APP_DIR}/storage/uploads` : "not configured"}
- App path: ${config?.DEPLOY_APP_DIR ?? expectedSharedVps.appDir}
- App port: ${config?.DEPLOY_APP_PORT ?? expectedSharedVps.appPort}
- PM2 process: ${config?.DEPLOY_PM2_PROCESS ?? expectedSharedVps.pm2Process}

## Database

- PostgreSQL setup: ${status.database ?? "not performed"}
- Database: ${expectedSharedVps.dbName}
- User: ${expectedSharedVps.dbUser}
- Migration status: ${status.migrations ?? "not applied"}
- Seed status: ${status.seed ?? "not completed"}

## QA

- CafeLuxe untouched: ${status.cafeluxeUntouched ?? "yes"}
- Smoke passed: ${status.smoke ?? "no"}
- Authenticated QA passed: ${status.authenticatedQa ?? "no"}
- Manglam demo QA passed: ${status.demoQa ?? "no"}
- Final demo readiness: ${status.readiness ?? "NOT READY FOR CLIENT DEMO"}

## Notes

${status.notes ?? "No additional notes."}
`;
  fs.writeFileSync(reportPath, content, "utf8");
}
