import crypto from "node:crypto";
import fs from "node:fs";
import {
  assertSafeDemoDatabaseUrl,
  demoEnvPath,
  demoExamplePath,
  formatEnv,
  parseEnvFile,
  validateRequiredEnv,
} from "./demo-utils.mjs";

const force = process.argv.includes("--force");

if (!fs.existsSync(demoExamplePath)) {
  throw new Error(".env.demo.example is missing.");
}

const example = parseEnvFile(demoExamplePath);
const exists = fs.existsSync(demoEnvPath);

if (!exists || force) {
  const values = {
    ...example,
    AUTH_SECRET: crypto.randomBytes(32).toString("base64"),
    MANGLAM_DEMO_ADMIN_PASSWORD: crypto.randomBytes(18).toString("base64url"),
  };
  fs.writeFileSync(demoEnvPath, formatEnv(values), "utf8");
  console.log(`${exists ? "Regenerated" : "Created"} .env.demo.local.`);
  console.log(`Demo admin email: ${values.MANGLAM_DEMO_ADMIN_EMAIL}`);
  console.log("Demo admin password was generated in .env.demo.local. Keep it local and do not commit it.");
} else {
  console.log(".env.demo.local already exists. Use npm run demo:env -- --force to regenerate local demo secrets.");
}

const values = parseEnvFile(demoEnvPath);
validateRequiredEnv(values);
assertSafeDemoDatabaseUrl(values.DATABASE_URL);
console.log("Local demo environment validation passed.");
