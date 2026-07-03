import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for migration safety checks.");
  process.exit(1);
}

const schema = "prisma/schema.prisma";
const prismaArgs = ["--workspace", "@trustfirst/database", "--", "prisma"];
const status = spawnSync("npm", ["exec", ...prismaArgs, "migrate", "status", "--schema", schema], {
  encoding: "utf8",
  shell: process.platform === "win32",
  stdio: "pipe",
});
const statusOutput = `${status.stdout ?? ""}${status.stderr ?? ""}`;
process.stdout.write(statusOutput);

const hasPendingMigrations = /Following migrations have not yet been applied/i.test(statusOutput);
if (status.status !== 0 && !hasPendingMigrations) {
  console.error("Prisma migration status failed. Review the database before deploying.");
  process.exit(status.status ?? 1);
}

if (process.argv.includes("--apply")) {
  console.log("Applying migrations with prisma migrate deploy.");
  const deploy = spawnSync(
    "npm",
    ["exec", ...prismaArgs, "migrate", "deploy", "--schema", schema],
    { shell: process.platform === "win32", stdio: "inherit" },
  );
  process.exit(deploy.status ?? 1);
}

console.log("Migration safety check passed. Use --apply only after backup and release approval.");
