import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "linux" || process.arch !== "x64") {
  process.exit(0);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bindingPackage = "@rolldown/binding-linux-x64-gnu";
const bindingDirectory = path.join(repoRoot, "node_modules", "@rolldown", "binding-linux-x64-gnu");
const bindingPath = path.join(bindingDirectory, "package.json");

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

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "trustfirst-rolldown-"));
console.log(`Extracting ${bindingPackage}@${version} for Linux x64 without mutating the workspace dependency tree.`);

const npmCommand = process.env.npm_execpath ? process.execPath : "npm";
const npmArgs = process.env.npm_execpath
  ? [process.env.npm_execpath, "pack", `${bindingPackage}@${version}`, "--silent", "--pack-destination", temporaryDirectory]
  : ["pack", `${bindingPackage}@${version}`, "--silent", "--pack-destination", temporaryDirectory];
const packResult = spawnSync(npmCommand, npmArgs, {
  cwd: repoRoot,
  encoding: "utf8",
  shell: false,
  stdio: ["ignore", "pipe", "inherit"],
});

if (packResult.status !== 0) {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  console.error(`Failed to download ${bindingPackage}@${version}.`);
  process.exit(packResult.status ?? 1);
}

const archiveName = String(packResult.stdout ?? "").trim().split(/\r?\n/u).filter(Boolean).at(-1);
const archivePath = archiveName ? path.join(temporaryDirectory, archiveName) : "";
if (!archivePath || !fs.existsSync(archivePath)) {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  console.error(`npm pack did not produce an archive for ${bindingPackage}@${version}.`);
  process.exit(1);
}

fs.mkdirSync(bindingDirectory, { recursive: true });
const extractResult = spawnSync("tar", ["-xzf", archivePath, "--strip-components=1", "-C", bindingDirectory], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: false,
  stdio: "inherit",
});
fs.rmSync(temporaryDirectory, { force: true, recursive: true });

if (extractResult.status !== 0 || !fs.existsSync(bindingPath)) {
  fs.rmSync(bindingDirectory, { force: true, recursive: true });
  console.error(`Failed to extract ${bindingPackage}@${version}.`);
  process.exit(extractResult.status ?? 1);
}

console.log(`${bindingPackage}@${version} extracted successfully.`);
