"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

type OfflineQueueNoticeDetail = {
  documentNumber?: string;
  label?: string;
};

export function OfflineQueueNotice() {
  const [notice, setNotice] = useState<{ documentNumber: string; label: string } | null>(null);

  useEffect(() => {
    let timeout: number | null = null;
    function handleQueueChanged(event: Event) {
      const detail = (event as CustomEvent<OfflineQueueNoticeDetail>).detail;
      if (!detail?.documentNumber) return;
      if (timeout !== null) window.clearTimeout(timeout);
      setNotice({
        documentNumber: detail.documentNumber,
        label: detail.label?.trim() || "Document",
      });
      timeout = window.setTimeout(() => setNotice(null), 10_000);
    }

    window.addEventListener("trustfirst:offline-queue-changed", handleQueueChanged);
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
      window.removeEventListener("trustfirst:offline-queue-changed", handleQueueChanged);
    };
  }, []);

  if (!notice) return null;
  return (
    <div className="no-print fixed bottom-16 right-3 z-[90] flex max-w-sm items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 shadow-lg">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.label} saved offline</p>
        <p className="mt-1">
          <span className="font-mono font-semibold">{notice.documentNumber}</span> will sync automatically after reconnection.
        </p>
      </div>
      <button aria-label="Dismiss offline save notice" onClick={() => setNotice(null)} type="button">
        <X className="size-4" />
      </button>
    </div>
  );
}
