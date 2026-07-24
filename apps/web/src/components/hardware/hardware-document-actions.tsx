"use client";

import { Button } from "@trustfirst/ui";
import { Check, FileInput, FileText, Printer } from "lucide-react";
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
  const isQuotation = document.type === "SALES_QUOTATION";
  const isStockDocument = !["SALES_QUOTATION", "PURCHASE_ORDER"].includes(document.type);

  async function run(action: "confirm" | "convert" | "invoice") {
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
    setError(null);
    setPending(action);
    const endpoint =
      action === "confirm"
        ? `/api/hardware/trade/${document.id}/confirm`
        : action === "convert"
          ? `/api/hardware/trade/${document.id}/convert-to-sale`
          : `/api/hardware/trade/${document.id}/invoice-draft`;
    const result = await postHardwareJson<unknown>(
      endpoint,
      action === "confirm" ? (isStockDocument ? { locationId } : {}) : undefined,
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
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/hardware/print/${document.id}`} target="_blank"><Printer className="size-4" />Print preview</Link>
        </Button>
      </div>
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
