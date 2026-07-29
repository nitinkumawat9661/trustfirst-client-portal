import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.CI || process.platform !== "linux" || process.arch !== "x64") {
  process.exit(0);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bindingPackage = "@rolldown/binding-linux-x64-gnu";
const bindingPath = path.join(repoRoot, "node_modules", "@rolldown", "binding-linux-x64-gnu", "package.json");

if (fs.existsSync(bindingPath)) {
  console.log(`${bindingPackage} is already installed.`);
  process.exit(0);
}

const rolldownPackagePath = path.join(repoRoot, "node_modules", "rolldown", "package.json");
if (!fs.existsSync(rolldownPackagePath)) {
  console.error("Rolldown is not installed; cannot resolve the matching Linux native binding version.");
  process.exit(1);
}

const rolldown = JSON.parse(fs.readFileSync(rolldownPackagePath, "utf8"));
const version = String(rolldown.version ?? "").trim();
if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/u.test(version)) {
  console.error(`Invalid Rolldown version: ${version || "missing"}`);
  process.exit(1);
}

console.log(`Installing ${bindingPackage}@${version} for Linux CI without pruning workspace dev dependencies.`);
const installArgs = [
  "install",
  "--no-save",
  "--no-package-lock",
  "--include=dev",
  "--include=optional",
  "--ignore-scripts",
  "--legacy-peer-deps",
  `${bindingPackage}@${version}`,
];

const command = process.env.npm_execpath ? process.execPath : "npm";
const args = process.env.npm_execpath ? [process.env.npm_execpath, ...installArgs] : installArgs;
const result = spawnSync(command, args, {
  cwd: repoRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    NODE_ENV: "development",
    npm_config_omit: "",
    npm_config_production: "false",
  },
  shell: false,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error(`Failed to install ${bindingPackage}@${version}.`);
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(bindingPath)) {
  console.error(`${bindingPackage}@${version} installation completed but the native package is still missing.`);
  process.exit(1);
}

console.log(`${bindingPackage}@${version} installed successfully.`);
