"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { QuickPosForm } from "./quick-pos-form";

const pendingLabel = "OFFLINE COPY · PENDING SYNC";

type QueueNoticeDetail = {
  documentNumber?: string;
  label?: string;
};

export function OfflineQuickPosForm(props: ComponentProps<typeof QuickPosForm>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingInvoiceRef = useRef<string | null>(null);
  const [pendingInvoice, setPendingInvoice] = useState<string | null>(null);

  useEffect(() => {
    const originalOpen = window.open.bind(window);
    window.open = function patchedOpen(url?: string | URL, target?: string, features?: string) {
      const popup = originalOpen(url, target, features);
      if (!popup) return popup;
      const originalWrite = popup.document.write.bind(popup.document);
      popup.document.write = (...html: string[]) => originalWrite(
        ...html.map((value) => pendingInvoiceRef.current
          ? value.replaceAll("FINAL INVOICE", pendingLabel)
          : value),
      );
      return popup;
    };

    function handleQueueChanged(event: Event) {
      const detail = (event as CustomEvent<QueueNoticeDetail>).detail;
      if (detail?.label !== "Counter sale" || !detail.documentNumber) return;
      pendingInvoiceRef.current = detail.documentNumber;
      setPendingInvoice(detail.documentNumber);
    }

    window.addEventListener("trustfirst:offline-queue-changed", handleQueueChanged);
    return () => {
      window.open = originalOpen;
      window.removeEventListener("trustfirst:offline-queue-changed", handleQueueChanged);
    };
  }, []);

  useEffect(() => {
    if (!pendingInvoice) return;
    const root = rootRef.current;
    if (!root) return;

    const applyPendingState = () => markOfflineQuickPosDom(root);
    applyPendingState();
    const observer = new MutationObserver(applyPendingState);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pendingInvoice]);

  return (
    <div ref={rootRef}>
      {pendingInvoice ? (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Counter sale {pendingInvoice} saved on this device.</p>
            <p className="mt-1">
              The A4 copy is marked pending sync. Stock, ledger, GST and payment posting will complete after reconnection. Reload after sync to open the final server invoice or WhatsApp action.
            </p>
          </div>
        </div>
      ) : null}
      <QuickPosForm {...props} />
    </div>
  );
}

export function markOfflineQuickPosDom(root: ParentNode) {
  for (const element of root.querySelectorAll<HTMLElement>("a[href^='/admin/hardware/print/'], a[target='_blank']")) {
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
  }
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.childElementCount === 0 && element.textContent?.trim() === "FINAL INVOICE") {
      element.textContent = pendingLabel;
    }
  }
}

export const offlineQuickPosPendingLabel = pendingLabel;
