"use client";

import { Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function buildIsolatedPrintDocument(input: {
  baseHref: string;
  billHtml: string;
  stylesHtml: string;
  title: string;
}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(input.baseHref)}" />
  <title>${escapeHtml(input.title)}</title>
  ${input.stylesHtml}
  <style>
    @page { size: A4 portrait; margin: 5mm 6mm; }
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

export function PrintButton({
  autoPrint = false,
  fileName,
  label,
}: {
  autoPrint?: boolean;
  fileName?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const autoPrintStarted = useRef(false);

  useEffect(() => {
    if (fileName) document.title = fileName;
  }, [fileName]);

  const printWhenReady = useCallback(async () => {
    const printRoot = document.querySelector<HTMLElement>(".print-sheet");
    if (!printRoot) {
      setStatus("Printable bill was not found.");
      return;
    }

    setStatus(fileName ? "Preparing bill-only A4 document..." : "Preparing bill-only print...");
    const clone = printRoot.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".no-print").forEach((node) => node.remove());
    const stylesHtml = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join(String.fromCharCode(10));
    const title = fileName ?? "Mangalam Sanitary Bill";
    const printWindow = window.open("", "_blank", "width=1050,height=850");
    if (!printWindow) {
      setStatus("Popup blocked. Allow popups for this site and try again.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(buildIsolatedPrintDocument({
      baseHref: `${window.location.origin}/`,
      billHtml: clone.outerHTML,
      stylesHtml,
      title,
    }));
    printWindow.document.close();

    const images = Array.from(printWindow.document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));
    await printWindow.document.fonts?.ready;
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 150);
    setStatus("Bill-only print dialog opened. Save as PDF or print on A4.");
  }, [fileName]);

  useEffect(() => {
    if (!autoPrint || autoPrintStarted.current) return;
    autoPrintStarted.current = true;
    void printWhenReady();
  }, [autoPrint, printWhenReady]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" onClick={printWhenReady} type="button">
        <Printer className="size-4" />{label ?? (fileName ? "Print A4 document" : "Print")}
      </button>
      {status ? <p className="max-w-xs text-right text-xs text-zinc-600" role="status">{status}</p> : null}
    </div>
  );
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
