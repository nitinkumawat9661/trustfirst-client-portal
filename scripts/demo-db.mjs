import { demoEnv, assertSafeDemoDatabaseUrl, validateRequiredEnv, run } from "./demo-utils.mjs";

const env = demoEnv();
validateRequiredEnv(env);
assertSafeDemoDatabaseUrl(env.DATABASE_URL);

run("npm", ["run", "db:generate"], { env });
run("npm", ["exec", "--workspace", "@trustfirst/database", "--", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"], { env });
console.log("Local demo database migrations applied.");
