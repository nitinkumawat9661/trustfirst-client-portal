import { demoEnv, assertSafeDemoDatabaseUrl, validateRequiredEnv, run } from "./demo-utils.mjs";

const env = demoEnv();
validateRequiredEnv(env);
assertSafeDemoDatabaseUrl(env.DATABASE_URL);
console.log("Starting TrustFirst Client Portal with local demo environment.");
console.log("Demo URL: http://localhost:3000");
run("npm", ["run", "dev", "--workspace", "@trustfirst/web"], { env });
