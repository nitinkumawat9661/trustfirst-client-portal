"use client";

import { Button } from "@trustfirst/ui";
import { Printer } from "lucide-react";
import { useRef, useState } from "react";

type PrintFormat = "58mm" | "80mm" | "a4";

export function DirectPrintButton({
  className,
  documentTitle,
  format = "a4",
  invoiceOnly = false,
  label = "Print",
  url,
}: {
  className?: string;
  documentTitle?: string;
  format?: PrintFormat;
  invoiceOnly?: boolean;
  label?: string;
  url: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  async function printViaIframe() {
    cleanupRef.current?.();
    setStatus("Preparing print...");
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = withFormat(url, format);
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    const cleanup = () => {
      iframe.remove();
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;

    iframe.addEventListener("load", () => {
      void printLoadedFrame(iframe, cleanup);
    }, { once: true });
    document.body.appendChild(iframe);
  }

  async function printLoadedFrame(iframe: HTMLIFrameElement, cleanup: () => void) {
    const printWindow = iframe.contentWindow;
    const printDocument = iframe.contentDocument;
    if (!printWindow || !printDocument) {
      setStatus("Print could not start. Use retry after the printable document opens.");
      cleanup();
      return;
    }
    try {
      await waitForPrintableDocument(printDocument);
      preparePrintableDocument(printDocument, { documentTitle, invoiceOnly });
      printWindow.onafterprint = () => {
        setStatus("Print dialog closed.");
        window.setTimeout(cleanup, 250);
      };
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => {
        if (cleanupRef.current) cleanupRef.current();
      }, 120_000);
      setStatus("System print dialog opened. Reprint creates no new transaction.");
    } catch {
      cleanup();
      setStatus("Print could not start. Open the printable page and use Print again.");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button className={className} onClick={printViaIframe} size="sm" type="button" variant="ghost">
        <Printer className="size-4" />{label}
      </Button>
      {status ? <span className="max-w-64 text-xs text-muted-foreground" role="status">{status}</span> : null}
    </span>
  );
}

async function waitForPrintableDocument(document: Document) {
  const fonts = "fonts" in document ? (document as Document & { fonts: FontFaceSet }).fonts.ready : Promise.resolve();
  const images = Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  }));
  await Promise.all([fonts, ...images]);
}

function preparePrintableDocument(
  document: Document,
  options: { documentTitle?: string; invoiceOnly: boolean },
) {
  if (options.documentTitle) {
    document.title = sanitizeDocumentTitle(options.documentTitle);
  }

  if (!options.invoiceOnly) return;

  const style = document.createElement("style");
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
  document.head.appendChild(style);

  const footer = document.querySelector("footer");
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

function withFormat(url: string, format: PrintFormat) {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("format", format);
  return parsed.toString();
}
