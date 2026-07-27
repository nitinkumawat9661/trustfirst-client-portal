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

  function printViaIframe() {
    cleanupRef.current?.();
    setStatus("Preparing print...");

    const requestId = crypto.randomUUID();
    const iframe = document.createElement("iframe");
    let timeoutId: number | null = null;

    iframe.setAttribute("aria-hidden", "true");
    iframe.src = withPrintOptions(url, {
      documentTitle,
      format,
      invoiceOnly,
      requestId,
    });
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
      iframe.remove();
      cleanupRef.current = null;
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isPrintMessage(event.data) || event.data.requestId !== requestId) return;

      if (event.data.status === "ready") {
        setStatus("Printable invoice ready. Opening system print dialog...");
        return;
      }
      if (event.data.status === "opened") {
        setStatus("System print dialog opened. Reprint creates no new transaction.");
        return;
      }
      if (event.data.status === "closed") {
        setStatus("Print dialog closed.");
        window.setTimeout(cleanup, 250);
        return;
      }

      setStatus(event.data.message ?? "Print could not start. Please retry.");
      cleanup();
    };

    cleanupRef.current = cleanup;
    window.addEventListener("message", handleMessage);
    document.body.appendChild(iframe);

    timeoutId = window.setTimeout(() => {
      setStatus("Printable invoice did not respond. Please retry after refreshing the page.");
      cleanup();
    }, 120_000);
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
