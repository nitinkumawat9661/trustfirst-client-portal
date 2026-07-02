import { deploymentUrl, loadDeployConfig, validateDeployConfig, writeReport } from "./vps-utils.mjs";

let config;
try {
  config = loadDeployConfig();
  validateDeployConfig(config);
} catch (error) {
  writeReport({
    config: {},
    status: {
      summary: "VPS deployment automation is prepared, but authorized VPS access is not configured.",
      ssh: "blocked",
      env: "no",
      migrations: "not applied",
      seed: "not completed",
      readiness: "NOT READY FOR CLIENT DEMO",
      notes: error instanceof Error ? error.message : String(error),
    },
  });
  console.log("Generated VPS_DEPLOYMENT_REPORT.md with blocked status.");
  process.exit(0);
}

writeReport({
  config,
  status: {
    summary: "VPS deployment automation is ready to run against the configured authorized target.",
    url: deploymentUrl(config),
    ssh: "not yet validated by report command",
    env: "pending bootstrap",
    database: "pending bootstrap",
    migrations: "pending deploy",
    seed: "pending deploy",
    smoke: "pending deploy",
    readiness: "NOT READY FOR CLIENT DEMO",
    notes: "Run npm run vps:validate, npm run vps:bootstrap, and npm run vps:deploy.",
  },
});
console.log("Generated VPS_DEPLOYMENT_REPORT.md.");
