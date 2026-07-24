import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStorageAssetPath } from "./local-storage-path";

describe("resolveStorageAssetPath", () => {
  it("resolves assets beside the configured upload directory", () => {
    expect(resolveStorageAssetPath(
      "client-assets/tenant/logo.jpeg",
      { UPLOAD_DIR: "/var/www/trustfirst-client-portal/storage/uploads" },
      "/var/www/trustfirst-client-portal/apps/web",
    )).toBe(path.resolve("/var/www/trustfirst-client-portal/storage/client-assets/tenant/logo.jpeg"));
  });

  it("resolves workspace-local storage when Next runs inside apps/web", () => {
    expect(resolveStorageAssetPath(
      "client-assets/tenant/logo.jpeg",
      {},
      path.resolve("workspace/apps/web"),
    )).toBe(path.resolve("workspace/storage/client-assets/tenant/logo.jpeg"));
  });

  it("rejects traversal outside tenant storage", () => {
    expect(resolveStorageAssetPath(
      "../private-key",
      { UPLOAD_DIR: "/var/www/trustfirst-client-portal/storage/uploads" },
    )).toBeNull();
  });
});
