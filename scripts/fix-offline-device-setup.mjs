import { readFileSync, writeFileSync } from "node:fs";

function replaceExactlyOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${path}: expected exactly one source match, found ${occurrences}`);
  }
  writeFileSync(path, source.replace(before, after));
}

const lockBefore = '        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${context.tenantId}:${config.series}:${financialYear}`}))`;';
const lockAfter = [
  '        await tx.$queryRaw<Array<{ locked: number }>>`',
  '          SELECT 1::int AS "locked"',
  '          FROM pg_advisory_xact_lock(hashtext(${`${context.tenantId}:${config.series}:${financialYear}`}))',
  '        `;',
].join("\n");

replaceExactlyOnce(
  "apps/web/src/server/offline/number-lease-service.ts",
  lockBefore,
  lockAfter,
);

replaceExactlyOnce(
  "e2e/mangalam-erp.spec.ts",
  `  await expect(rememberedGst).toHaveValue("12");
});`,
  `  await expect(rememberedGst).toHaveValue("12");

  const offlinePanelButton = page.getByRole("button", { name: /Open offline sync panel/i });
  await offlinePanelButton.click();
  await page.getByRole("button", { name: "Setup offline device", exact: true }).click();
  await expect(page.getByText(/Ready · \\d+ products · \\d+ parties · \\d+ stock rows/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Unexpected offline setup error.", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close offline sync panel", exact: true }).click();
});`,
);

console.log("Offline device setup fix applied.");
