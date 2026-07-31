import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();
const sourceRoots = [
  path.join(repositoryRoot, "apps", "web", "src"),
  path.join(repositoryRoot, "packages"),
];
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]);
const violations = [];

for (const sourceRoot of sourceRoots) {
  for (const filePath of await walk(sourceRoot)) {
    if (!sourceExtensions.has(path.extname(filePath))) continue;
    await validateFile(filePath);
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations detected:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("ARCHITECTURE_BOUNDARIES_VERIFIED");

async function validateFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const relativePath = normalizePath(path.relative(repositoryRoot, filePath));
  const imports = extractImports(source);

  if (relativePath.startsWith("apps/web/src/components/")) {
    rejectImports(relativePath, imports, ["@prisma/client", "@trustfirst/database"],
      "UI components must not access Prisma or the database package directly");
  }

  if (relativePath.startsWith("apps/web/src/server/")) {
    for (const importedModule of imports) {
      if (importedModule.startsWith("@/components/") || importedModule.includes("/components/")) {
        report(relativePath, "server modules must not import UI components", importedModule);
      }
    }
  }

  if (relativePath.includes("/features/") && relativePath.includes("/core/")) {
    for (const importedModule of imports) {
      if (!importedModule.startsWith(".")) {
        report(relativePath, "feature core modules may import only their own relative pure modules", importedModule);
      }
    }

    const forbiddenRuntimeTokens = [
      /\bwindow\s*[.[]/u,
      /\bdocument\s*[.[]/u,
      /\bHTMLElement\b/u,
      /\bHTML[A-Z][A-Za-z]+Element\b/u,
      /from\s+["']react["']/u,
      /from\s+["']next(?:\/[^"']*)?["']/u,
      /from\s+["']lucide-react["']/u,
    ];

    for (const token of forbiddenRuntimeTokens) {
      if (token.test(source)) {
        violations.push(`${relativePath}: pure feature core contains browser/UI dependency ${token}`);
      }
    }
  }

  if (relativePath.includes("/features/") && relativePath.includes("/browser/")) {
    rejectImports(relativePath, imports, ["@prisma/client", "@trustfirst/database"],
      "browser adapters must not access persistence directly");
    for (const importedModule of imports) {
      if (importedModule.startsWith("@/server/")) {
        report(relativePath, "browser adapters must not import server services", importedModule);
      }
    }
  }

  if (relativePath.startsWith("packages/")) {
    for (const importedModule of imports) {
      if (importedModule.startsWith("@/") || importedModule.includes("apps/web")) {
        report(relativePath, "shared packages must not depend on the web application", importedModule);
      }
    }
  }
}

function extractImports(source) {
  const modules = new Set();
  const staticImportPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;
  const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/gu;
  const requirePattern = /require\(\s*["']([^"']+)["']\s*\)/gu;

  for (const pattern of [staticImportPattern, dynamicImportPattern, requirePattern]) {
    for (const match of source.matchAll(pattern)) modules.add(match[1]);
  }

  return [...modules];
}

function rejectImports(relativePath, imports, forbiddenModules, reason) {
  for (const importedModule of imports) {
    if (forbiddenModules.includes(importedModule)) report(relativePath, reason, importedModule);
  }
}

function report(relativePath, reason, importedModule) {
  violations.push(`${relativePath}: ${reason} (${importedModule})`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else files.push(entryPath);
  }

  return files;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}
