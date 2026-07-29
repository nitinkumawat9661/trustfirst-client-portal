"use client";

import { Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
    setStatus(fileName ? "Preparing A4 document..." : "Preparing print...");
    if (fileName) document.title = fileName;
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    })));
    window.print();
    setStatus(fileName ? "Print dialog opened. Save as PDF or print the A4 document." : "Print dialog opened. Confirm the printer dialog and check output.");
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
