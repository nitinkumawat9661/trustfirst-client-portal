"use client";

import { Button } from "@trustfirst/ui";
import { Printer } from "lucide-react";
import { useRef, useState } from "react";

type PrintFormat = "58mm" | "80mm" | "a4";

export function DirectPrintButton({
  className,
  format = "a4",
  label = "Print",
  url,
}: {
  className?: string;
  format?: PrintFormat;
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

function withFormat(url: string, format: PrintFormat) {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("format", format);
  return parsed.toString();
}
