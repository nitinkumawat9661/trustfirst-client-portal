"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

export function PrintButton() {
  const [status, setStatus] = useState<string | null>(null);

  async function printWhenReady() {
    setStatus("Preparing print...");
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));
    window.print();
    setStatus("Print dialog opened. Confirm the printer dialog and check output.");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" onClick={printWhenReady} type="button">
        <Printer className="size-4" />Print
      </button>
      {status ? <p className="max-w-xs text-right text-xs text-zinc-600" role="status">{status}</p> : null}
    </div>
  );
}
