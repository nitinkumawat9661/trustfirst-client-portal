import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for migration safety checks.");
  process.exit(1);
}

const schema = "prisma/schema.prisma";
const migrationsRoot = path.resolve("packages/database/prisma/migrations");
const prismaArgs = ["--workspace", "@trustfirst/database", "--", "prisma"];
const status = runPrisma(["migrate", "status", "--schema", schema], "pipe");
const statusOutput = `${status.stdout ?? ""}${status.stderr ?? ""}`;
process.stdout.write(statusOutput);

const pendingMigrations = pendingMigrationNames(statusOutput);
const hasPendingMigrations = pendingMigrations.length > 0
  || /Following migrations have not yet been applied/i.test(statusOutput);

if (status.status !== 0 && !hasPendingMigrations) {
  console.error("Prisma migration status failed. Review the database before deploying.");
  process.exit(status.status ?? 1);
}

if (hasPendingMigrations && pendingMigrations.length === 0) {
  console.error("Pending migrations were reported, but their names could not be parsed safely.");
  process.exit(1);
}

for (const migrationName of pendingMigrations) {
  assertAdditiveMigration(migrationName);
}

if (process.argv.includes("--apply")) {
  if (!pendingMigrations.length) {
    console.log("No pending database migrations to apply.");
    process.exit(0);
  }

  console.log(`Applying ${pendingMigrations.length} verified additive migration(s) with prisma migrate deploy.`);
  const deploy = runPrisma(["migrate", "deploy", "--schema", schema], "inherit");
  process.exit(deploy.status ?? 1);
}

if (pendingMigrations.length) {
  console.log(`Migration safety check passed for additive migrations: ${pendingMigrations.join(", ")}`);
} else {
  console.log("Migration safety check passed. Database schema is current.");
}

function runPrisma(args, stdio) {
  return spawnSync("npm", ["exec", ...prismaArgs, ...args], {
    encoding: stdio === "pipe" ? "utf8" : undefined,
    shell: process.platform === "win32",
    stdio,
  });
}

export function pendingMigrationNames(output) {
  const lines = output.split(/\r?\n/u).map((line) => line.trim());
  const start = lines.findIndex((line) => /Following migrations have not yet been applied/i.test(line));
  if (start < 0) return [];

  const pending = [];
  for (const line of lines.slice(start + 1)) {
    if (!line) continue;
    if (/^\d{14}_[A-Za-z0-9_-]+$/u.test(line)) {
      pending.push(line);
      continue;
    }
    if (pending.length) break;
  }
  return pending;
}

export function assertAdditiveMigration(migrationName) {
  if (!/^\d{14}_[A-Za-z0-9_-]+$/u.test(migrationName)) {
    throw new Error(`Unsafe migration name: ${migrationName}`);
  }

  const migrationPath = path.join(migrationsRoot, migrationName, "migration.sql");
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Pending migration SQL was not found: ${migrationName}`);
  }

  const rawSql = fs.readFileSync(migrationPath, "utf8");
  const sql = stripSqlComments(rawSql);
  const forbidden = [
    [/\bDROP\s+(?:TABLE|COLUMN|SCHEMA|TYPE|INDEX|CONSTRAINT)\b/iu, "DROP operation"],
    [/\bTRUNCATE\b/iu, "TRUNCATE operation"],
    [/\bDELETE\s+FROM\b/iu, "DELETE operation"],
    [/\bUPDATE\s+(?:\"[^\"]+\"|[A-Za-z0-9_.]+)\s+SET\b/iu, "data UPDATE operation"],
    [/\bALTER\s+TABLE\b[\s\S]*?\bDROP\b/iu, "ALTER TABLE DROP operation"],
    [/\bALTER\s+TABLE\b[\s\S]*?\bRENAME\b/iu, "ALTER TABLE RENAME operation"],
    [/\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b/iu, "ALTER COLUMN operation"],
    [/\bREVOKE\b/iu, "REVOKE operation"],
  ];

  for (const [pattern, label] of forbidden) {
    if (pattern.test(sql)) {
      throw new Error(`Migration ${migrationName} is not additive: ${label} detected.`);
    }
  }

  const statements = splitSqlStatements(sql);
  if (!statements.length) {
    throw new Error(`Migration ${migrationName} contains no executable SQL.`);
  }

  const allowedStatement = /^(?:CREATE\s+(?:UNIQUE\s+)?INDEX|CREATE\s+TABLE|CREATE\s+TYPE|CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS|ALTER\s+TABLE\s+[\s\S]+?\s+ADD\s+(?:COLUMN|CONSTRAINT)|ALTER\s+TYPE\s+[\s\S]+?\s+ADD\s+VALUE|COMMENT\s+ON)\b/iu;
  for (const statement of statements) {
    if (!allowedStatement.test(statement)) {
      throw new Error(`Migration ${migrationName} contains an unsupported non-additive statement: ${statement.slice(0, 120)}`);
    }
  }
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/--[^\r\n]*/gu, " ");
}

function splitSqlStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim().replace(/\s+/gu, " "))
    .filter(Boolean);
}
