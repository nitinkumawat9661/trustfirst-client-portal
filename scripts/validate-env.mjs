const required = [
  { key: "DATABASE_URL", validate: isUrl },
  { key: "AUTH_SECRET", validate: (value) => value.length >= 32 },
];

const recommended = [
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

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
