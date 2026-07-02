import { demoEnv, run } from "./demo-utils.mjs";

run("npm", ["run", "demo:env"]);
const env = demoEnv();
run("npm", ["run", "demo:db"], { env });
run("npm", ["run", "demo:manglam"], { env });
run("npm", ["run", "deploy:env"], { env });
run("npm", ["run", "db:generate"], { env });
console.log("Local Manglam demo setup completed.");
