"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

export function PrintButton({ documentTitle }: { documentTitle?: string } = {}) {
  const [status, setStatus] = useState<string | null>(null);

  async function printWhenReady() {
    setStatus(documentTitle ? "Preparing A4 invoice..." : "Preparing print...");
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));

    const previousTitle = document.title;
    const nextTitle = documentTitle ? sanitizeFilename(documentTitle) : "";
    if (nextTitle) document.title = nextTitle;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    if (nextTitle) window.addEventListener("afterprint", restoreTitle);
    window.print();
    if (nextTitle) window.setTimeout(restoreTitle, 1500);
    setStatus(documentTitle ? "A4 print dialog opened. Save as PDF or select the A4 printer." : "Print dialog opened. Confirm the printer dialog and check output.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" onClick={printWhenReady} type="button">
        <Printer className="size-4" />{documentTitle ? "Print A4 invoice" : "Print"}
      </button>
      {status ? <p className="max-w-xs text-right text-xs text-zinc-600" role="status">{status}</p> : null}
    </div>
  );
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/gu, "-").replace(/\s+/gu, " ").trim().slice(0, 150);
}
