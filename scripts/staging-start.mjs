import path from "node:path";
import {
  assertSafeDemoDatabaseUrl,
  parseEnvFile,
  repoRoot,
  run,
  validateRequiredEnv,
} from "./demo-utils.mjs";

const env = {
  ...process.env,
  ...parseEnvFile(path.join(repoRoot, ".env.staging.local")),
  PORT: "3100",
};
validateRequiredEnv(env);
assertSafeDemoDatabaseUrl(env.DATABASE_URL);
if (!env.DATABASE_URL.toLowerCase().includes("staging")) {
  throw new Error("Refusing to start against a database that is not explicitly staging-named.");
}
console.log("Starting isolated Mangalam staging at http://127.0.0.1:3100.");
run("npm", ["run", "dev", "--workspace", "@trustfirst/web", "--", "-p", "3100"], { env });
