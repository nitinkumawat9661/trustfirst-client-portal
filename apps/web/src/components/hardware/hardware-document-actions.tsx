"use client";

import { Button } from "@trustfirst/ui";
import { Ban, Check, FileText, Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HardwareTradeSummary } from "@/server/hardware";
import { postHardwareJson } from "./hardware-api-client";

type LocationOption = { id: string; name: string };

export function HardwareDocumentActions({
  document,
  locations,
}: {
  document: HardwareTradeSummary;
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const isEstimate = document.type === "SALES_QUOTATION";
  const isStockDocument = document.type !== "PURCHASE_ORDER";
  const canCancelSale =
    (document.type === "SALES_ORDER" || isEstimate) &&
    document.status === "CONFIRMED";

  async function run(action: "confirm" | "invoice" | "cancel") {
    const cancellationReason =
      action === "cancel"
        ? window.prompt(`Reason for cancelling ${document.documentNumber}`)
        : null;
    if (action === "cancel" && (!cancellationReason || cancellationReason.trim().length < 3)) {
      setError("Cancellation reason is required.");
      return;
    }
    if (
      action === "confirm" &&
      !window.confirm(
        isStockDocument
          ? `Confirm ${document.documentNumber} and post its stock and financial sale impact?`
          : `Confirm ${document.documentNumber}?`,
      )
    ) {
      return;
    }
    if (
      action === "cancel" &&
      !window.confirm(`Cancel ${document.documentNumber} and reverse its stock and customer-balance impact?`)
    ) {
      return;
    }
    setError(null);
    setPending(action);
    const endpoint =
      action === "confirm"
        ? `/api/hardware/trade/${document.id}/confirm`
        : action === "invoice"
          ? `/api/hardware/trade/${document.id}/invoice-draft`
          : `/api/hardware/trade/${document.id}/cancel`;
    const result = await postHardwareJson<unknown>(
      endpoint,
      action === "confirm"
        ? (isStockDocument ? { locationId } : {})
        : action === "cancel"
          ? {
              confirm: true,
              idempotencyKey: `sale-cancel-${document.id}-${Date.now()}`,
              ...(isEstimate ? {} : { locationId }),
              reason: cancellationReason?.trim(),
            }
          : undefined,
    );
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {document.status === "DRAFT" && isStockDocument ? (
          <select
            aria-label="Stock location"
            className="h-9 min-w-40 rounded-md border border-input bg-background px-2 text-xs"
            onChange={(event) => setLocationId(event.target.value)}
            value={locationId}
          >
            <option value="">Select stock location</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        ) : null}
        {canCancelSale && !isEstimate ? (
          <select
            aria-label="Cancellation stock location"
            className="h-9 min-w-40 rounded-md border border-input bg-background px-2 text-xs"
            onChange={(event) => setLocationId(event.target.value)}
            value={locationId}
          >
            <option value="">Return stock to location</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        ) : null}
        {document.status === "DRAFT" ? (
          <Button
            disabled={pending !== null || (isStockDocument && !locationId)}
            onClick={() => run("confirm")}
            size="sm"
            type="button"
            variant="outline"
          >
            <Check className="size-4" />{isEstimate ? "Post Estimate Bill" : "Confirm"}
          </Button>
        ) : null}
        {isEstimate && document.status === "CONFIRMED" ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/hardware/quotations/${document.id}/edit`}><Pencil className="size-4" />Edit Estimate Bill</Link>
          </Button>
        ) : null}
        {document.type === "SALES_ORDER" && document.status === "CONFIRMED" && !document.billingInvoiceId ? (
          <Button disabled={pending !== null} onClick={() => run("invoice")} size="sm" type="button" variant="outline">
            <FileText className="size-4" />Create invoice draft
          </Button>
        ) : null}
        {canCancelSale ? (
          <Button
            disabled={pending !== null || (!isEstimate && !locationId)}
            onClick={() => run("cancel")}
            size="sm"
            type="button"
            variant="outline"
          >
            <Ban className="size-4" />{isEstimate ? "Cancel Estimate Bill" : "Cancel sale"}
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/hardware/print/${document.id}`} target="_blank"><Printer className="size-4" />{isEstimate ? "Print Estimate Bill" : "Print preview"}</Link>
        </Button>
      </div>
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
