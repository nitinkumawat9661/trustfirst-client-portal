"use client";

import { useEffect, useRef } from "react";

type PrintStatus = "ready" | "opened" | "closed" | "error";

export function AutoPrintController({
  documentTitle,
  enabled,
  invoiceOnly,
  requestId,
}: {
  documentTitle: string | undefined;
  enabled: boolean;
  invoiceOnly: boolean;
  requestId: string | undefined;
}) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    let finished = false;
    const postStatus = (status: PrintStatus, message?: string) => {
      const payload = {
        source: "trustfirst-print",
        requestId: requestId ?? "standalone",
        status,
        ...(message ? { message } : {}),
      };
      window.parent.postMessage(payload, "*");
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      postStatus("closed");
    };

    async function startPrint() {
      try {
        postStatus("ready");
        await waitForPrintableDocument(document);
        preparePrintableDocument(document, { documentTitle, invoiceOnly });
        window.addEventListener("afterprint", finish, { once: true });
        postStatus("opened");
        window.setTimeout(() => {
          try {
            window.focus();
            window.print();
          } catch {
            postStatus("error", "The browser blocked the system print dialog.");
          }
        }, 50);
      } catch {
        postStatus("error", "The printable document could not be prepared.");
      }
    }

    void startPrint();

    return () => {
      window.removeEventListener("afterprint", finish);
    };
  }, [documentTitle, enabled, invoiceOnly, requestId]);

  return null;
}

async function waitForPrintableDocument(currentDocument: Document) {
  const fonts = "fonts" in currentDocument
    ? (currentDocument as Document & { fonts: FontFaceSet }).fonts.ready
    : Promise.resolve();
  const images = Array.from(currentDocument.images).map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      }));
  await Promise.all([fonts, ...images]);
}

function preparePrintableDocument(
  currentDocument: Document,
  options: { documentTitle: string | undefined; invoiceOnly: boolean },
) {
  if (options.documentTitle) {
    currentDocument.title = sanitizeDocumentTitle(options.documentTitle);
  }

  if (!options.invoiceOnly) return;

  const style = currentDocument.createElement("style");
  style.dataset.invoicePrintIsolation = "true";
  style.textContent = `
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      html, body {
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
      }
      body { display: block !important; }
      main {
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
      }
      .print-sheet {
        width: 100% !important;
        max-width: none !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        box-shadow: none !important;
      }
      .no-print,
      [data-app-shell],
      [data-sync-widget],
      [data-floating-ui],
      [role="dialog"] {
        display: none !important;
      }
      footer {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  `;
  currentDocument.head.appendChild(style);

  const footer = currentDocument.querySelector("footer");
  if (!footer) return;

  footer.className = "print-break-avoid";
  footer.setAttribute(
    "style",
    "margin-top:12px;border-top:1px solid #a1a1aa;padding-top:8px;font-size:10px;line-height:1.45;color:#000;",
  );
  footer.innerHTML = `
    <div style="font-weight:600;margin-bottom:3px;">Terms</div>
    <ol style="margin:0;padding-left:16px;">
      <li>This is a computer-generated invoice and does not require a signature.</li>
      <li>Goods once sold will be returned or exchanged only as per store policy.</li>
      <li>Please verify the goods and quantities at the time of delivery.</li>
      <li>All disputes are subject to Sikar jurisdiction only.</li>
      <li>E. &amp; O.E.</li>
    </ol>
    <div style="margin-top:5px;">Legal proprietor: KRISHAN KUMAR</div>
  `;
}

function sanitizeDocumentTitle(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180) || "MANGALAM-SANITARY-INVOICE";
}
