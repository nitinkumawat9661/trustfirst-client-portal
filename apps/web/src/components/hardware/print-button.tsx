"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

export function PrintButton({ fileName }: { fileName: string }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    document.title = fileName;
  }, [fileName]);

  async function printWhenReady() {
    setStatus("Preparing A4 invoice...");
    document.title = fileName;
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));
    window.print();
    setStatus("Print dialog opened. Save as PDF or print the A4 invoice.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" onClick={printWhenReady} type="button">
        <Printer className="size-4" />Print A4 invoice
      </button>
      {status ? <p className="max-w-xs text-right text-xs text-zinc-600" role="status">{status}</p> : null}
    </div>
  );
}
