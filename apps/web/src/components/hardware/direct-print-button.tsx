"use client";

import { Button } from "@trustfirst/ui";
import { Printer } from "lucide-react";
import { useRef, useState } from "react";

type PrintFormat = "58mm" | "80mm" | "a4";
type PrintMessage = {
  message?: string;
  requestId: string;
  source: "trustfirst-print";
  status: "ready" | "opened" | "closed" | "error";
};

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

  function openSystemPrint() {
    cleanupRef.current?.();
    setStatus("Preparing print...");

    const requestId = crypto.randomUUID();
    const printUrl = withPrintOptions(url, {
      documentTitle,
      format,
      invoiceOnly,
      requestId,
    });
    const printWindow = window.open(
      printUrl,
      `trustfirst-print-${requestId}`,
      "popup=yes,width=1100,height=820,resizable=yes,scrollbars=yes",
    );

    if (!printWindow) {
      setStatus("Popup blocked. Allow popups for this site, then press Print again.");
      return;
    }

    let timeoutId: number | null = null;
    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
      if (!printWindow.closed) printWindow.close();
      cleanupRef.current = null;
    };

    const stopWaitingWithoutClosing = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener("message", handleMessage);
      cleanupRef.current = null;
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== printWindow) return;
      if (!isPrintMessage(event.data) || event.data.requestId !== requestId) return;

      if (event.data.status === "ready") {
        setStatus("Printable invoice ready. Opening system print dialog...");
        return;
      }
      if (event.data.status === "opened") {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        setStatus("System print dialog opened. Save the PDF, then close the invoice window.");
        return;
      }
      if (event.data.status === "closed") {
        setStatus("Print dialog closed. Complete the Save as PDF file dialog, then close the invoice window.");
        stopWaitingWithoutClosing();
        return;
      }

      setStatus(event.data.message ?? "Print could not start. Please retry.");
      cleanup();
    };

    cleanupRef.current = cleanup;
    window.addEventListener("message", handleMessage);
    printWindow.focus();

    timeoutId = window.setTimeout(() => {
      setStatus("Printable invoice did not respond. Refresh the ERP page and retry.");
      cleanup();
    }, 120_000);
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button className={className} onClick={openSystemPrint} size="sm" type="button" variant="ghost">
        <Printer className="size-4" />{label}
      </Button>
      {status ? <span className="max-w-64 text-xs text-muted-foreground" role="status">{status}</span> : null}
    </span>
  );
}

function isPrintMessage(value: unknown): value is PrintMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PrintMessage>;
  return candidate.source === "trustfirst-print"
    && typeof candidate.requestId === "string"
    && (candidate.status === "ready"
      || candidate.status === "opened"
      || candidate.status === "closed"
      || candidate.status === "error");
}

function withPrintOptions(
  url: string,
  options: {
    documentTitle: string | undefined;
    format: PrintFormat;
    invoiceOnly: boolean;
    requestId: string;
  },
) {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("format", options.format);
  parsed.searchParams.set("autoprint", "1");
  parsed.searchParams.set("requestId", options.requestId);
  if (options.documentTitle) parsed.searchParams.set("title", options.documentTitle);
  if (options.invoiceOnly) parsed.searchParams.set("invoiceOnly", "1");
  return parsed.toString();
}
