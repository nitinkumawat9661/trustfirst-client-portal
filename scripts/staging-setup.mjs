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
};
validateRequiredEnv(env);
assertSafeDemoDatabaseUrl(env.DATABASE_URL);
if (!env.DATABASE_URL.toLowerCase().includes("staging")) {
  throw new Error("Refusing to set up a database that is not explicitly staging-named.");
}

run("docker", ["compose", "-f", "docker-compose.staging.yml", "up", "-d", "--wait"]);
run("npm", ["run", "db:generate"], { env });
run("npm", ["exec", "--workspace", "@trustfirst/database", "--", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"], { env });
run("node", ["scripts/seed-manglam-demo.mjs"], { env });
console.log("Mangalam isolated staging database is ready on 127.0.0.1:55433.");
