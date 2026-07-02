import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const demoEnvPath = path.join(repoRoot, ".env.demo.local");
export const demoExamplePath = path.join(repoRoot, ".env.demo.example");

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

export function loadDemoEnv() {
  const values = parseEnvFile(demoEnvPath);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  return values;
}

export function demoEnv() {
  return { ...process.env, ...loadDemoEnv() };
}

export function validateRequiredEnv(env) {
  const missing = ["DATABASE_URL", "AUTH_SECRET", "AUTH_URL"].filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required demo env: ${missing.join(", ")}`);
  }
  if (env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }
}

export function assertSafeDemoDatabaseUrl(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const text = databaseUrl.toLowerCase();
  const productionLike = /\b(prod|production|live)\b/.test(text);
  const host = parsed.hostname.toLowerCase();
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const demoNamed = text.includes("demo") || text.includes("local");

  if (productionLike) {
    throw new Error("Refusing production-like DATABASE_URL for local demo.");
  }
  if (!localHost && !demoNamed) {
    throw new Error("DATABASE_URL must be local or clearly demo-named.");
  }
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}.`);
  }
}

export function formatEnv(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}="${String(value).replaceAll('"', '\\"')}"`)
    .join("\n")}\n`;
}
