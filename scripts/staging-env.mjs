import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  assertSafeDemoDatabaseUrl,
  formatEnv,
  parseEnvFile,
  repoRoot,
  validateRequiredEnv,
} from "./demo-utils.mjs";

const examplePath = path.join(repoRoot, ".env.staging.example");
const envPath = path.join(repoRoot, ".env.staging.local");
const force = process.argv.includes("--force");

if (!fs.existsSync(examplePath)) throw new Error(".env.staging.example is missing.");
const example = parseEnvFile(examplePath);
const exists = fs.existsSync(envPath);

if (!exists || force) {
  const values = {
    ...example,
    AUTH_SECRET: crypto.randomBytes(32).toString("base64"),
    MANGLAM_DEMO_ADMIN_PASSWORD: crypto.randomBytes(18).toString("base64url"),
  };
  fs.writeFileSync(envPath, formatEnv(values), "utf8");
  console.log(`${exists ? "Regenerated" : "Created"} .env.staging.local.`);
  console.log(`Staging admin email: ${values.MANGLAM_DEMO_ADMIN_EMAIL}`);
  console.log("Staging password was generated locally and was not printed.");
}

const values = parseEnvFile(envPath);
validateRequiredEnv(values);
assertSafeDemoDatabaseUrl(values.DATABASE_URL);
if (!values.DATABASE_URL.toLowerCase().includes("staging")) {
  throw new Error("Staging DATABASE_URL must contain the word staging.");
}
console.log("Isolated staging environment validation passed.");
