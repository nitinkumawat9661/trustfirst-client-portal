const isProduction = process.env.NODE_ENV === "production";
const approvedProductionHosts = new Set([
  "app.mangalamsanitary.in",
  "client.trustfirstsolutions.in",
  "mangalamsanitary.in",
  "www.mangalamsanitary.in",
]);

const required = [
  { key: "DATABASE_URL", validate: isUrl },
  { key: "AUTH_SECRET", validate: (value) => value.length >= 32 },
  ...(isProduction
    ? [
        { key: "AUTH_TRUST_HOST", validate: (value) => value === "true" },
        { key: "AUTH_URL", validate: isApprovedProductionUrl },
        { key: "NEXTAUTH_URL", validate: isApprovedProductionUrl },
      ]
    : []),
];

const recommended = isProduction
  ? []
  : [
      { key: "AUTH_URL", validate: isUrl },
      { key: "NEXTAUTH_URL", validate: isUrl },
    ];

const failures = [];
const warnings = [];

for (const entry of required) {
  const value = process.env[entry.key];
  if (!value) {
    failures.push(`${entry.key} is missing.`);
    continue;
  }
  if (!entry.validate(value)) {
    failures.push(`${entry.key} is present but invalid.`);
  }
}

for (const entry of recommended) {
  const value = process.env[entry.key];
  if (!value) {
    warnings.push(`${entry.key} is not set.`);
    continue;
  }
  if (!entry.validate(value)) {
    warnings.push(`${entry.key} is present but invalid.`);
  }
}

if ((process.env.AUTH_SECRET?.length ?? 0) < 64) {
  warnings.push("AUTH_SECRET should be at least 64 characters for production rotation strength.");
}

if (warnings.length > 0) {
  console.warn("Environment warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error("Environment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Environment validation passed.");

function isApprovedProductionUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && approvedProductionHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
