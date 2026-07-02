import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const deployEnvPath = path.join(repoRoot, ".env.deploy.local");
export const reportPath = path.join(repoRoot, "VPS_DEPLOYMENT_REPORT.md");

const forbiddenHosts = new Set(["45.10.21.141", "cafeluxesite.in", "www.cafeluxesite.in"]);
const confirmationValue = "yes";

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
  config.DEPLOY_APP_DIR = config.DEPLOY_APP_DIR || "/var/www/trustfirst-client-portal";
  config.DEPLOY_ENV_FILE = config.DEPLOY_ENV_FILE || "/etc/trustfirst-client-portal.env";
  return config;
}

export function validateDeployConfig(config) {
  const missing = ["DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_KEY_PATH"].filter((key) => !config[key]?.trim());
  if (missing.length > 0) throw new Error(`Missing deployment values: ${missing.join(", ")}`);

  if (config.DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM?.toLowerCase() !== confirmationValue) {
    throw new Error("Set DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes in .env.deploy.local to confirm the target is authorized for TrustFirst/Manglam staging.");
  }

  const host = config.DEPLOY_HOST.trim().toLowerCase();
  if (forbiddenHosts.has(host) || host.includes("cafeluxe") || host.includes("cafeluxesite")) {
    throw new Error("Refusing deployment to a known CafeLuxe host/IP/domain.");
  }

  if (!fs.existsSync(resolveKeyPath(config.DEPLOY_KEY_PATH))) {
    throw new Error("DEPLOY_KEY_PATH does not exist.");
  }

  if (!/^\d+$/.test(config.DEPLOY_PORT)) {
    throw new Error("DEPLOY_PORT must be numeric.");
  }

  if (config.DEPLOY_APP_DIR.includes(".git") || config.DEPLOY_ENV_FILE.includes(config.DEPLOY_APP_DIR)) {
    throw new Error("Deployment env file must live outside the git app directory.");
  }
}

export function resolveKeyPath(keyPath) {
  if (keyPath.startsWith("~")) return path.join(process.env.USERPROFILE || process.env.HOME || "", keyPath.slice(1));
  return path.resolve(repoRoot, keyPath);
}

export function sshBaseArgs(config) {
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
    "StrictHostKeyChecking=accept-new",
    `${config.DEPLOY_USER}@${config.DEPLOY_HOST}`,
  ];
}

export function runSsh(config, remoteCommand, options = {}) {
  return spawnSync("ssh", [...sshBaseArgs(config), remoteCommand], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: options.stdio ?? "pipe",
  });
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
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/REMOTE HOST IDENTIFICATION HAS CHANGED|Host key verification failed/i.test(output)) {
    throw new Error("SSH host key verification failed or host key mismatch detected. Refusing deployment.");
  }
}

export function assertSafeDatabaseUrl(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");
  const lower = databaseUrl.toLowerCase();
  if (/\b(prod|production|live)\b/.test(lower)) {
    throw new Error("Refusing production-like DATABASE_URL.");
  }
  if (!lower.includes("trustfirst_demo") && !lower.includes("127.0.0.1") && !lower.includes("localhost")) {
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
  return `http://${config.DEPLOY_HOST}:3000`;
}

export function writeReport({ config, status }) {
  const content = `# VPS Deployment Report

## Status

${status.summary}

## Deployment Target

- VPS URL: ${status.url ?? "not available"}
- Host: ${maskHost(config?.DEPLOY_HOST)}
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

## Database

- PostgreSQL setup: ${status.database ?? "not performed"}
- Database: trustfirst_demo
- User: trustfirst_demo
- Migration status: ${status.migrations ?? "not applied"}
- Seed status: ${status.seed ?? "not completed"}

## QA

- Smoke passed: ${status.smoke ?? "no"}
- Authenticated QA passed: ${status.authenticatedQa ?? "no"}
- Manglam demo QA passed: ${status.demoQa ?? "no"}
- Final demo readiness: ${status.readiness ?? "NOT READY FOR CLIENT DEMO"}

## Notes

${status.notes ?? "No additional notes."}
`;
  fs.writeFileSync(reportPath, content, "utf8");
}
