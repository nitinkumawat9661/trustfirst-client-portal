import { deploymentUrl, loadDeployConfig, runLocal, validateDeployConfig } from "./vps-utils.mjs";

const config = loadDeployConfig();
validateDeployConfig(config);
const url = deploymentUrl(config);
runLocal("npm", ["run", "deploy:smoke"], {
  env: { ...process.env, SMOKE_BASE_URL: url },
});
