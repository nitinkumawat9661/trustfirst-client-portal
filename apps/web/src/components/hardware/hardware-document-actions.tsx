"use client";

import { Button } from "@trustfirst/ui";
import { Ban, Check, FileInput, FileText, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HardwareTradeSummary } from "@/server/hardware";
import { DirectPrintButton } from "./direct-print-button";
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
  const isQuotation = document.type === "SALES_QUOTATION";
  const isStockDocument = !["SALES_QUOTATION", "PURCHASE_ORDER"].includes(document.type);
  const canCancelSale = document.type === "SALES_ORDER" && document.status === "CONFIRMED";

  async function run(action: "confirm" | "convert" | "invoice" | "cancel" | "correct") {
    const cancellationReason =
      action === "cancel"
        ? window.prompt(`Reason for cancelling ${document.documentNumber}`)
        : null;
    const correctionReason =
      action === "correct"
        ? window.prompt(`Why does ${document.documentNumber} need correction? Example: wrong quantity, wrong rate, wrong customer.`)
        : null;
    if (action === "cancel" && (!cancellationReason || cancellationReason.trim().length < 3)) {
      setError("Cancellation reason is required.");
      return;
    }
    if (action === "correct" && (!correctionReason || correctionReason.trim().length < 3)) {
      setError("Correction reason is required.");
      return;
    }
    if (
      (action === "confirm" || action === "convert") &&
      !window.confirm(
        action === "convert"
          ? `Convert ${document.documentNumber} into a new sales order?`
          : isStockDocument
            ? `Confirm ${document.documentNumber} and post its stock movement?`
            : `Finalize ${document.documentNumber}?`,
      )
    ) {
      return;
    }
    if (
      action === "cancel" &&
      !window.confirm(`Cancel ${document.documentNumber}, void linked invoice, and reverse stock movement?`)
    ) {
      return;
    }
    setError(null);
    setPending(action);
    const endpoint =
      action === "confirm"
        ? `/api/hardware/trade/${document.id}/confirm`
        : action === "convert"
          ? `/api/hardware/trade/${document.id}/convert-to-sale`
          : action === "invoice"
            ? `/api/hardware/trade/${document.id}/invoice-draft`
            : action === "correct"
              ? `/api/hardware/trade/${document.id}/correction-assessment`
              : `/api/hardware/trade/${document.id}/cancel`;
    const result = await postHardwareJson<unknown>(
      endpoint,
      action === "confirm"
        ? (isStockDocument ? { locationId } : {})
        : action === "cancel"
          ? {
              confirm: true,
              idempotencyKey: `sale-cancel-${document.id}-${Date.now()}`,
              locationId,
              reason: cancellationReason?.trim(),
            }
          : action === "correct"
            ? {
                confirm: true,
                idempotencyKey: `correction-assessment-${document.id}-${Date.now()}`,
                reason: "OTHER",
                reasonDetails: correctionReason?.trim(),
              }
          : undefined,
    );
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (action === "correct") {
      const assessment = result.data as { messages: string[]; nextAction: string };
      setError(`Correction policy: ${assessment.nextAction}. ${assessment.messages.join(" ")}`);
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
        {canCancelSale ? (
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
            <Check className="size-4" />{isQuotation ? "Finalize" : "Confirm"}
          </Button>
        ) : null}
        {isQuotation && document.status === "CONFIRMED" ? (
          <Button disabled={pending !== null} onClick={() => run("convert")} size="sm" type="button" variant="outline">
            <FileInput className="size-4" />Convert to sale
          </Button>
        ) : null}
        {document.type === "SALES_ORDER" && document.status === "CONFIRMED" && !document.billingInvoiceId ? (
          <Button disabled={pending !== null} onClick={() => run("invoice")} size="sm" type="button" variant="outline">
            <FileText className="size-4" />Create invoice draft
          </Button>
        ) : null}
        {canCancelSale ? (
          <Button disabled={pending !== null || !locationId} onClick={() => run("cancel")} size="sm" type="button" variant="outline">
            <Ban className="size-4" />Cancel sale
          </Button>
        ) : null}
        {document.status !== "ARCHIVED" ? (
          <Button disabled={pending !== null} onClick={() => run("correct")} size="sm" type="button" variant="outline">
            <PencilLine className="size-4" />Correct bill
          </Button>
        ) : null}
        <DirectPrintButton format="a4" label="Print" url={`/admin/hardware/print/${document.id}`} />
      </div>
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
