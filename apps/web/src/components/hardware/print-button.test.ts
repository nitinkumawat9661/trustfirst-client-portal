import { describe, expect, it } from "vitest";
import { buildIsolatedPrintDocument } from "./print-button";

describe("bill-only print document", () => {
  it("contains only the supplied bill root and A4 print contract", () => {
    const html = buildIsolatedPrintDocument({
      baseHref: "https://app.mangalamsanitary.in/",
      billHtml: '<section class="print-sheet"><h1>Tax Invoice</h1></section>',
      stylesHtml: "<style>.print-sheet{color:#000}</style>",
      title: "MS-INV-1",
    });

    expect(html).toContain('class="print-sheet"');
    expect(html).toContain("Tax Invoice");
    expect(html).toContain("@page { size: A4 portrait; margin: 5mm 6mm; }");
    expect(html).not.toContain("ERP top header");
    expect(html).not.toContain("Sync widget");
  });
});
