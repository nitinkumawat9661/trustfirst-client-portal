import {
  A4_PRINT_PAGE_RULE,
  type IsolatedPrintDocumentInput,
} from "./print-contract";

/**
 * Builds the complete document written into the isolated print window.
 *
 * This module is deliberately pure: it must not access React, Next.js, window,
 * document, the database, or server services. Keeping it pure makes the A4
 * print contract deterministic and independently testable.
 */
export function buildIsolatedPrintDocument(input: IsolatedPrintDocumentInput) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(input.baseHref)}" />
  <title>${escapeHtml(input.title)}</title>
  ${input.stylesHtml}
  <style${nonceAttribute(input.nonce)}>
    ${input.printCss ?? ""}
    ${A4_PRINT_PAGE_RULE}
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body { width: auto !important; min-height: 0 !important; overflow: visible !important; }
    .no-print { display: none !important; }
    .print-sheet {
      width: 100% !important;
      max-width: none !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    .print-table { min-width: 0 !important; }
  </style>
</head>
<body>${input.billHtml}</body>
</html>`;
}

function nonceAttribute(nonce: string | undefined) {
  return nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
