import { describe, expect, it } from "vitest";
import {
  A4_PRINT_PAGE_RULE,
  buildIsolatedPrintDocument,
} from "../../features/hardware/printing";

describe("bill-only print document", () => {
  it("contains only the supplied bill root and the A4 print contract", () => {
    const html = buildIsolatedPrintDocument({
      baseHref: "https://app.mangalamsanitary.in/",
      billHtml: '<section class="print-sheet"><h1>Tax Invoice</h1></section>',
      stylesHtml: "<style>.print-sheet{color:#000}</style>",
      title: "MS-INV-1",
    });

    expect(html).toContain('<body><section class="print-sheet">');
    expect(html).toContain("Tax Invoice");
    expect(html).toContain(A4_PRINT_PAGE_RULE);
    expect(html).not.toContain("ERP top header");
    expect(html).not.toContain("Sync widget");
    expect(html).not.toContain("sidebar");
  });

  it("escapes document metadata without changing trusted bill markup", () => {
    const html = buildIsolatedPrintDocument({
      baseHref: 'https://app.mangalamsanitary.in/?from="billing"',
      billHtml: '<section class="print-sheet"><strong>₹1,180.00</strong></section>',
      nonce: 'nonce"value',
      stylesHtml: "",
      title: '<Invoice & "Receipt">',
    });

    expect(html).toContain("&lt;Invoice &amp; &quot;Receipt&quot;&gt;");
    expect(html).toContain("nonce=\"nonce&quot;value\"");
    expect(html).toContain("<strong>₹1,180.00</strong>");
  });

  it("keeps non-print controls hidden even if a nested control survives cloning", () => {
    const html = buildIsolatedPrintDocument({
      baseHref: "https://app.mangalamsanitary.in/",
      billHtml: '<section class="print-sheet"><button class="no-print">Edit</button></section>',
      stylesHtml: "",
      title: "Estimate Bill",
    });

    expect(html).toContain(".no-print { display: none !important; }");
  });
});
