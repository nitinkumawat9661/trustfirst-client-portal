import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const deployScript = fs.readFileSync(
  fileURLToPath(new URL("../../../../../scripts/deploy-production-ci.sh", import.meta.url)),
  "utf8",
);
const migrationSafety = fs.readFileSync(
  fileURLToPath(new URL("../../../../../scripts/migration-safety.mjs", import.meta.url)),
  "utf8",
);

describe("production additive migration deployment", () => {
  it("captures migration status without triggering the global ERR trap", () => {
    expect(deployScript).toContain('if MIGRATION_STATUS="$(npm exec --workspace @trustfirst/database -- prisma migrate status');
    expect(deployScript).not.toContain('set +e\nMIGRATION_STATUS="$(npm exec');
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
