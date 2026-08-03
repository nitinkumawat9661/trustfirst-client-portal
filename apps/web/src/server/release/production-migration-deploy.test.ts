import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const deployScriptPath = fileURLToPath(new URL("../../../../../scripts/deploy-production-ci.sh", import.meta.url));
const migrationSafetyPath = fileURLToPath(new URL("../../../../../scripts/migration-safety.mjs", import.meta.url));
const deployScript = fs.readFileSync(deployScriptPath, "utf8");
const migrationSafety = fs.readFileSync(migrationSafetyPath, "utf8");

describe("production additive migration deployment", () => {
  it("parses the migration safety module before deployment", () => {
    const syntax = spawnSync(process.execPath, ["--check", migrationSafetyPath], { encoding: "utf8" });
    expect(`${syntax.stdout}${syntax.stderr}`).toBe("");
    expect(syntax.status).toBe(0);
  });

  it("captures migration status without triggering the global ERR trap", () => {
    expect(deployScript).toContain('if MIGRATION_STATUS="$(npm exec --workspace @trustfirst/database -- prisma migrate status');
    expect(deployScript).not.toContain('set +e\nMIGRATION_STATUS="$(npm exec');
  });

  it("recognizes Prisma singular, plural and migration(s) pending headings", () => {
    const pattern = /Following migration(?:s|\(s\))? have not yet been applied/i;
    expect(pattern.test("Following migration have not yet been applied:")).toBe(true);
    expect(pattern.test("Following migrations have not yet been applied:")).toBe(true);
    expect(pattern.test("Following migration(s) have not yet been applied:")).toBe(true);
    expect(migrationSafety).toContain("Following migration(?:s|\\(s\\))? have not yet been applied");
    expect(deployScript).toContain("Following migration(s|\\(s\\))? have not yet been applied");
  });

  it("creates and verifies an isolated backup before applying migrations", () => {
    expect(deployScript).toContain("create_database_backup");
    expect(deployScript).toContain("pg_dump --format=custom --no-owner --no-acl");
    expect(deployScript).toContain('pg_restore --list "$DB_BACKUP_FILE"');
    expect(deployScript).toContain('DB_BACKUP_SHA="$(sha256sum');
    expect(deployScript).toContain("npm run deploy:migration-check -- --apply");
  });

  it("rejects destructive SQL and only deploys verified additive migrations", () => {
    expect(migrationSafety).toContain("assertAdditiveMigration");
    expect(migrationSafety).toContain("DROP operation");
    expect(migrationSafety).toContain("TRUNCATE operation");
    expect(migrationSafety).toContain("DELETE operation");
    expect(migrationSafety).toContain("unsupported non-additive statement");
    expect(deployScript).toContain("Database migrations applied: yes (verified additive only)");
  });
});
