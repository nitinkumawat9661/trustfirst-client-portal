import path from "node:path";

export function resolveStorageAssetPath(
  assetKey: string,
  env: { NODE_ENV?: string; UPLOAD_DIR?: string } = process.env,
  cwd = process.cwd(),
) {
  const storageRoot = env.UPLOAD_DIR
    ? path.dirname(path.resolve(env.UPLOAD_DIR))
    : cwd.endsWith(path.join("apps", "web"))
      ? path.resolve(cwd, "..", "..", "storage")
      : path.resolve(cwd, "storage");
  const assetPath = path.resolve(storageRoot, assetKey);
  if (!assetPath.startsWith(`${storageRoot}${path.sep}`)) {
    return null;
  }
  return assetPath;
}
