import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for migration safety checks.");
  process.exit(1);
}

const schema = "packages/database/prisma/schema.prisma";
const args = ["prisma", "migrate", "status", "--schema", schema];
const status = spawnSync("npx", args, { shell: process.platform === "win32", stdio: "inherit" });

if (status.status !== 0) {
  console.error("Prisma migration status failed. Review the database before deploying.");
  process.exit(status.status ?? 1);
}

if (process.argv.includes("--apply")) {
  console.log("Applying migrations with prisma migrate deploy.");
  const deploy = spawnSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", schema],
    { shell: process.platform === "win32", stdio: "inherit" },
  );
  process.exit(deploy.status ?? 1);
}

console.log("Migration safety check passed. Use --apply only after backup and release approval.");
