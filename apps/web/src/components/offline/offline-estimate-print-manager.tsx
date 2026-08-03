"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatOfflineAddress,
  IndexedDbOfflineDataStorage,
  type OfflineEstimatePrintPreview as OfflineEstimatePrintPreviewData,
  type OfflineSnapshot,
} from "@/lib/offline-data";
import type { QueuedMutation } from "@/lib/offline-queue";
import { OfflineEstimatePrintPreview } from "./offline-estimate-print-preview";

const queueKeyPrefix = "trustfirst.offlineQueue.v1.";

export function OfflineEstimatePrintManager() {
  const [preview, setPreview] = useState<OfflineEstimatePrintPreviewData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function handleQueueChanged() {
      const item = latestQueuedEstimate();
      if (!item) return;
      const storage = new IndexedDbOfflineDataStorage();
      const record = await storage.read({ tenantId: item.tenantId, userId: item.userId });
      if (!record) return;
      const nextPreview = buildEstimatePreview(item, record.snapshot);
      if (!nextPreview) return;
      setPreview(nextPreview);
      setOpen(true);
    }

    function handleEvent() {
      void handleQueueChanged();
    }

    window.addEventListener("trustfirst:offline-queue-changed", handleEvent);
    return () => window.removeEventListener("trustfirst:offline-queue-changed", handleEvent);
  }, []);

  return (
    <>
      {open && preview ? (
        <OfflineEstimatePrintPreview onClose={() => setOpen(false)} preview={preview} />
      ) : null}
      {!open && preview ? (
        <button
          className="no-print fixed bottom-16 left-3 z-[90] inline-flex h-10 items-center gap-2 rounded-md border border-amber-500/40 bg-zinc-950 px-3 text-sm font-medium text-white shadow-lg hover:bg-zinc-900"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Printer className="size-4" />
          Print offline {preview.documentNumber}
        </button>
      ) : null}
    </>
  );
}

function latestQueuedEstimate() {
  const candidates: QueuedMutation[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(queueKeyPrefix)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const value of parsed) {
        if (!isQueuedEstimate(value)) continue;
        candidates.push(value);
      }
    } catch {
      // Ignore malformed legacy queue entries; the active queue remains intact.
    }
  }
  return candidates.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

function isQueuedEstimate(value: unknown): value is QueuedMutation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QueuedMutation>;
  if (
    item.action !== "hardware.tradeDraft.create" ||
    (item.status !== "pending" && item.status !== "syncing" && item.status !== "failed") ||
    typeof item.tenantId !== "string" ||
    typeof item.userId !== "string" ||
    !item.payload ||
    typeof item.payload !== "object"
  ) {
    return false;
  }
  const input = asRecord(asRecord(item.payload).input);
  return input.type === "SALES_QUOTATION";
}

function buildEstimatePreview(
  item: QueuedMutation,
  snapshot: OfflineSnapshot,
): OfflineEstimatePrintPreviewData | null {
  const payload = asRecord(item.payload);
  const input = asRecord(payload.input);
  const metadata = asRecord(input.metadata);
  const documentNumber = readString(payload.documentNumber);
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (!documentNumber || rawItems.length === 0) return null;

  const products = new Map(snapshot.products.map((product) => [product.id, product]));
  const customerId = readString(input.customerId);
  const customer = customerId
    ? snapshot.customers.find((candidate) => candidate.id === customerId) ?? null
    : null;

  let grossCents = 0;
  let discountCents = 0;
  let taxableCents = 0;
  let taxCents = 0;
  const items = rawItems.flatMap((rawItem) => {
    const line = asRecord(rawItem);
    const productId = readString(line.productId);
    const quantity = readInteger(line.quantity);
    const unitRateCents = readInteger(line.unitAmountCents);
    const lineDiscountCents = readInteger(line.discountCents) ?? 0;
    const taxRateBps = readInteger(line.taxRateBps) ?? 0;
    if (!productId || !quantity || quantity <= 0 || unitRateCents === null || unitRateCents < 0) return [];

    const product = products.get(productId);
    const lineMetadata = asRecord(line.metadata);
    const lineGrossCents = quantity * unitRateCents;
    const lineTaxableCents = Math.max(lineGrossCents - lineDiscountCents, 0);
    const lineTaxCents = Math.round((lineTaxableCents * taxRateBps) / 10_000);
    grossCents += lineGrossCents;
    discountCents += lineDiscountCents;
    taxableCents += lineTaxableCents;
    taxCents += lineTaxCents;

    return [{
      description: product?.name ?? "Item",
      discountPercent: lineGrossCents > 0
        ? Math.round((lineDiscountCents / lineGrossCents) * 10_000) / 100
        : 0,
      hsnCode: readString(lineMetadata.hsnCode) ?? product?.hsnCode ?? null,
      lineTotalCents: lineTaxableCents + lineTaxCents,
      quantity,
      taxCents: lineTaxCents,
      taxRateBps,
      taxableCents: lineTaxableCents,
      unitCode: readString(lineMetadata.unitCode) ?? product?.unitCode ?? null,
      unitRateCents,
    }];
  });
  if (items.length === 0) return null;

  const roundOffCents = readInteger(input.roundOffCents) ?? 0;
  const totalCents = taxableCents + taxCents + roundOffCents;
  const paidAmountCents = Math.min(
    Math.max(readInteger(metadata.paidAmountCents) ?? 0, 0),
    Math.max(totalCents, 0),
  );
  const settings = snapshot.settings;

  return {
    customer: {
      address: readString(metadata.customerAddress),
      name: customer?.name ?? "Walk-in Customer",
      referenceNumber: readString(metadata.referenceNumber),
    },
    documentDate: readString(metadata.documentDate) ?? item.createdAt.slice(0, 10),
    documentNumber,
    firm: {
      address: formatOfflineAddress(settings?.address),
      email: settings?.email ?? null,
      gstin: settings?.gstin ?? null,
      name: settings?.firmName ?? snapshot.tenant.name,
      phone: settings?.phone ?? null,
      termsFooter: settings?.termsFooter ?? null,
    },
    generatedAt: item.createdAt,
    items,
    paymentMode: readString(metadata.paymentMode) ?? "Credit",
    taxMode: metadata.taxMode === "inter-state" ? "inter-state" : "intra-state",
    totals: {
      discountCents,
      grossCents,
      paidAmountCents,
      roundOffCents,
      taxCents,
      taxableCents,
      totalCents,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
