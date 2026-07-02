import { spawnSync } from "node:child_process";
import dns from "node:dns/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  deployEnvPath,
  hasTrustedHostKeyGate,
  hostKeyVerificationPath,
  knownHostsTarget,
  loadDeployConfig,
  maskHost,
  normalizeFingerprint,
  repoRoot,
  resolveKeyPath,
  runSsh,
  shellQuote,
} from "./vps-utils.mjs";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    ...options,
  });
}

function keyFingerprint(knownHostsLine) {
  const result = run("ssh-keygen", ["-lf", "-"], { input: `${knownHostsLine.trim()}\n` });
  if (result.status !== 0) return null;
  const line = result.stdout.trim();
  const match = line.match(/^\S+\s+SHA256:([^\s]+)\s+.*\(([^)]+)\)/);
  if (!match) return null;
  return {
    fingerprint: match[1],
    keyType: match[2],
    raw: line,
  };
}

function extractKeyLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && /\s(?:ssh-|ecdsa-)/.test(line));
}

function fingerprintLines(output) {
  return extractKeyLines(output)
    .map((line) => ({ line, fingerprint: keyFingerprint(line) }))
    .filter((entry) => entry.fingerprint);
}

async function resolveHost(host) {
  try {
    const records = await dns.lookup(host, { all: true });
    return records.map((record) => `${record.address} (${record.family === 6 ? "IPv6" : "IPv4"})`).join(", ");
  } catch (error) {
    return `resolution failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function writeVerificationReport({ config, dnsResult, knownHostOutput, scanOutput, knownFingerprints, currentFingerprints, mismatch, decision, notes, backupPath, repaired, sshVerifyOutput }) {
  const trusted = normalizeFingerprint(config?.DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256);
  const content = `# VPS Host Key Verification

## Summary

- Timestamp: ${new Date().toISOString()}
- Host masked: ${maskHost(config?.DEPLOY_HOST)}
- Port: ${config?.DEPLOY_PORT ?? "not configured"}
- DNS/IP result: ${dnsResult}
- Mismatch: ${mismatch ? "yes" : "no"}
- Required trusted fingerprint: ${trusted ? `SHA256:${trusted}` : config?.DEPLOY_HOST_KEY_VERIFIED?.toLowerCase() === "yes" ? "accepted by VPS owner via DEPLOY_HOST_KEY_VERIFIED=yes" : "missing"}
- Decision: ${decision}
- Known_hosts repaired: ${repaired ? "yes" : "no"}
- Backup path: ${backupPath || "not created"}
- Deployment attempted: no
- CafeLuxe untouched: yes

## Existing known_hosts Fingerprints

${knownFingerprints.length > 0 ? knownFingerprints.map((entry) => `- ${entry.fingerprint.keyType}: SHA256:${entry.fingerprint.fingerprint}`).join("\n") : "- none collected"}

## Current ssh-keyscan Fingerprints

${currentFingerprints.length > 0 ? currentFingerprints.map((entry) => `- ${entry.fingerprint.keyType}: SHA256:${entry.fingerprint.fingerprint}`).join("\n") : "- none collected"}

## Risk Explanation

A host-key mismatch can mean the VPS was rebuilt, the provider rotated host keys, DNS/IP now points to a different server, or a man-in-the-middle attack is possible. Deployment must not continue until the current fingerprint is confirmed by the VPS owner or provider through a trusted channel.

## Raw known_hosts Lookup

\`\`\`text
${knownHostOutput || "No known_hosts entry found or lookup failed."}
\`\`\`

## Raw ssh-keyscan Output

\`\`\`text
${scanOutput || "No ssh-keyscan output collected."}
\`\`\`

## Strict SSH Verification Output

\`\`\`text
${sshVerifyOutput || "Strict SSH verification was not run or did not complete."}
\`\`\`

## Notes

${notes}
`;
  fs.writeFileSync(hostKeyVerificationPath, content, "utf8");
}

let config;
try {
  config = loadDeployConfig();
} catch (error) {
  writeVerificationReport({
    config: {},
    dnsResult: "not available",
    knownHostOutput: "",
    scanOutput: "",
    knownFingerprints: [],
    currentFingerprints: [],
    mismatch: true,
    decision: "not verified",
    notes: `${error instanceof Error ? error.message : String(error)} Create .env.deploy.local from .env.deploy.example before collecting host-key evidence.`,
    repaired: false,
  });
  console.error("Host-key verification blocked: .env.deploy.local is missing.");
  process.exit(1);
}

const target = knownHostsTarget(config);
const dnsResult = await resolveHost(config.DEPLOY_HOST);
const knownHost = run("ssh-keygen", ["-F", target]);
const keyscan = run("ssh-keyscan", ["-p", config.DEPLOY_PORT || "22", config.DEPLOY_HOST]);
const knownOutput = `${knownHost.stdout ?? ""}${knownHost.stderr ?? ""}`.trim();
const scanOutput = `${keyscan.stdout ?? ""}${keyscan.stderr ?? ""}`.trim();
const knownFingerprints = fingerprintLines(knownHost.stdout ?? "");
const currentFingerprints = fingerprintLines(keyscan.stdout ?? "");
const knownSet = new Set(knownFingerprints.map((entry) => normalizeFingerprint(entry.fingerprint.fingerprint)));
const currentSet = new Set(currentFingerprints.map((entry) => normalizeFingerprint(entry.fingerprint.fingerprint)));
const mismatch = knownFingerprints.length > 0 && currentFingerprints.length > 0 && ![...currentSet].some((fingerprint) => knownSet.has(fingerprint));

if (currentFingerprints.length === 0) {
  writeVerificationReport({
    config,
    dnsResult,
    knownHostOutput: knownOutput,
    scanOutput,
    knownFingerprints,
    currentFingerprints,
    mismatch: true,
    decision: "not verified",
    notes: "ssh-keyscan did not return a usable host key. known_hosts was not modified.",
    repaired: false,
  });
  console.error("Host-key verification blocked: ssh-keyscan did not return a usable host key.");
  process.exit(1);
}

if (!hasTrustedHostKeyGate(config)) {
  writeVerificationReport({
    config,
    dnsResult,
    knownHostOutput: knownOutput,
    scanOutput,
    knownFingerprints,
    currentFingerprints,
    mismatch,
    decision: "not verified",
    notes: "Neither DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256 nor DEPLOY_HOST_KEY_VERIFIED=yes is configured. known_hosts was not modified.",
    repaired: false,
  });
  console.error("Host-key verification blocked: trusted fingerprint gate is missing.");
  process.exit(1);
}

const trustedFingerprint = normalizeFingerprint(config.DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256);
const ownerAccepted = config.DEPLOY_HOST_KEY_VERIFIED?.toLowerCase() === "yes";
const trustedMatchesCurrent = trustedFingerprint ? currentSet.has(trustedFingerprint) : ownerAccepted;
const verifiedKeyLines = trustedFingerprint
  ? currentFingerprints.filter((entry) => normalizeFingerprint(entry.fingerprint.fingerprint) === trustedFingerprint).map((entry) => entry.line)
  : extractKeyLines(keyscan.stdout ?? "");

if (!trustedMatchesCurrent) {
  writeVerificationReport({
    config,
    dnsResult,
    knownHostOutput: knownOutput,
    scanOutput,
    knownFingerprints,
    currentFingerprints,
    mismatch,
    decision: "not verified",
    notes: `Trusted fingerprint SHA256:${trustedFingerprint} does not match current ssh-keyscan fingerprints. known_hosts was not modified.`,
    repaired: false,
  });
  console.error("Host-key verification blocked: trusted fingerprint does not match current server key.");
  process.exit(1);
}

const sshDir = path.join(os.homedir(), ".ssh");
const knownHostsPath = path.join(sshDir, "known_hosts");
const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const backupPath = path.join(sshDir, `known_hosts.trustfirst-backup-${timestamp}`);

if (fs.existsSync(knownHostsPath)) {
  fs.copyFileSync(knownHostsPath, backupPath);
} else {
  fs.mkdirSync(sshDir, { recursive: true });
  fs.writeFileSync(backupPath, "", "utf8");
}
const remove = run("ssh-keygen", ["-R", target]);
if (remove.status !== 0) {
  writeVerificationReport({
    config,
    dnsResult,
    knownHostOutput: knownOutput,
    scanOutput,
    knownFingerprints,
    currentFingerprints,
    mismatch,
    decision: "not verified",
    notes: `Failed to remove only the target host entry from known_hosts. Backup remains at ${backupPath}.`,
    backupPath,
    repaired: false,
  });
  console.error(remove.stderr || remove.stdout || "Failed to remove known_hosts entry.");
  process.exit(remove.status ?? 1);
}

fs.appendFileSync(knownHostsPath, `${verifiedKeyLines.join("\n")}\n`, "utf8");
const verify = runSsh(config, `bash -lc ${shellQuote("hostname && uname -a")}`);
const sshVerifyOutput = `${verify.stdout ?? ""}\n${verify.stderr ?? ""}`.trim();

if (verify.status !== 0) {
  writeVerificationReport({
    config,
    dnsResult,
    knownHostOutput: knownOutput,
    scanOutput,
    knownFingerprints,
    currentFingerprints,
    mismatch,
    decision: "not verified",
    notes: `known_hosts was repaired from the accepted key, but strict SSH verification still failed. Backup path: ${backupPath}.`,
    backupPath,
    repaired: true,
    sshVerifyOutput,
  });
  console.error(sshVerifyOutput || "Strict SSH verification failed after known_hosts repair.");
  process.exit(verify.status ?? 1);
}

writeVerificationReport({
  config,
  dnsResult,
  knownHostOutput: knownOutput,
  scanOutput,
  knownFingerprints,
  currentFingerprints,
  mismatch,
  decision: trustedFingerprint ? "verified by trusted fingerprint match" : "verified by DEPLOY_HOST_KEY_VERIFIED=yes owner acceptance",
  notes: "known_hosts was backed up, only the configured host entry was removed, the verified key was added, and strict SSH verification succeeded.",
  backupPath,
  repaired: true,
  sshVerifyOutput,
});

console.log(`Host-key verification succeeded. known_hosts backup: ${backupPath}`);
