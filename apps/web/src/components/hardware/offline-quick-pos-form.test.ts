import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./offline-quick-pos-form.tsx", import.meta.url), "utf8");

describe("offline Quick POS adapter", () => {
  it("marks printed and on-screen copies as pending sync", () => {
    expect(source).toContain('const pendingLabel = "OFFLINE COPY · PENDING SYNC"');
    expect(source).toContain('replaceAll("FINAL INVOICE", pendingLabel)');
    expect(source).toContain('element.textContent = pendingLabel');
  });

  it("hides final server and external actions until the local bill syncs", () => {
    expect(source).toContain("a[href^='/admin/hardware/print/'], a[target='_blank']");
    expect(source).toContain("Reload after sync to open the final server invoice or WhatsApp action.");
  });
});
