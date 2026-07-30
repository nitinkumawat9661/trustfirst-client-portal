#!/usr/bin/env python3
from __future__ import annotations

import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / "scripts" / ".estimate-sale-fast-entry"

required = [
    PARTS_DIR / "part-00.b64",
    PARTS_DIR / "part-01.b64",
    PARTS_DIR / "part-02.b64",
    PARTS_DIR / "part-03.b64",
    PARTS_DIR / "part-04.b64",
    PARTS_DIR / "part-05.b64",
    PARTS_DIR / "part-06.b64",
]
missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
if missing:
    raise SystemExit("Missing Estimate Sale recovery chunks: " + ", ".join(missing))

# Intact original source bytes 0:18,000.
prefix_b64 = "".join(
    (PARTS_DIR / name).read_text(encoding="utf-8").strip()
    for name in ["part-00.b64", "part-01.b64"]
)
prefix = base64.b64decode(prefix_b64, validate=True)

# Intact original source bytes 21,003:36,000. part-02 starts at a shifted
# Base64 offset; dropping three characters resumes on a quartet boundary.
part_02 = (PARTS_DIR / "part-02.b64").read_text(encoding="utf-8").strip()
left_segment = base64.b64decode(part_02[3:], validate=True)

# Intact original source bytes 39,003:end. part-03 has the same shifted
# capture boundary; the remaining tail is continuous and ends with valid padding.
tail_b64 = (PARTS_DIR / "part-03.b64").read_text(encoding="utf-8").strip()[3:] + "".join(
    (PARTS_DIR / name).read_text(encoding="utf-8").strip()
    for name in ["part-04.b64", "part-05.b64", "part-06.b64"]
)
tail = base64.b64decode(tail_b64, validate=True)

# Recovered Estimate form save/edit request flow and the beginning of the form UI.
middle_one = r'''items,
        locationId,
        metadata,
        roundOffCents: totals.roundOffCents,
        type: "SALES_QUOTATION",
      };
      const result = initialDocument
        ? await patchHardwareJson<{ id: string }>(
            `/api/hardware/trade/${initialDocument.id}/estimate`,
            payload,
          )
        : await postHardwareJson<{ id: string }>("/api/hardware/sales", payload);
      if (!result.ok) throw new Error(result.message);

      if (!initialDocument) {
        const confirmed = await postHardwareJson<{ id: string }>(
          `/api/hardware/trade/${result.data.id}/confirm`,
          { locationId },
        );
        if (!confirmed.ok) throw new Error(confirmed.message);
      }

      router.push(`/admin/hardware/print/${result.data.id}`);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Estimate Bill could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{initialDocument ? `Edit ${initialDocument.documentNumber}` : "Estimate Bill details"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <CreatableCombobox
              createLabel="Use new customer"
              label="Customer"
              onCreate={(name) => {
                setCustomerId("");
                setCustomerName(name);
              }}
              onQueryChange={(query) => {
                setCustomerName(query);
                const exact = availableParties.find(
                  (party) => normalizeProductSearchText(party.name) === normalizeProductSearchText(query),
                );
                setCustomerId(exact?.id ?? "");
              }}
              onSelect={(id) => {
                const selected = availableParties.find((party) => party.id === id);
                setCustomerId(id);
                setCustomerName(selected?.name ?? "");
              }}
              options={availableParties.map((party) => ({
                id: party.id,
                keywords: [party.contact ?? ""],
                label: party.name,
              }))}
              placeholder="Search or enter customer"
              value={customerName}
            />
          </div>
          <Field label="Customer address">
            <Input onChange={(event) => setCustomerAddress(event.target.value)} value={customerAddress} />
          </Field>
          <Field label="'''.encode("utf-8")

# Recovered HardwareDocumentActions logic between its cancellation confirmation
# and the closing invoice-draft button. Estimate Bills no longer expose conversion.
middle_two = r'''ustomer-balance impact?`)
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
          <'''.encode("utf-8")

source = prefix + middle_one + left_segment + middle_two + tail
source = source.replace(
    b'import { postHardwareJson } from "./hardware-api-client";',
    b'import { patchHardwareJson, postHardwareJson } from "./hardware-api-client";',
    1,
)

try:
    source.decode("utf-8")
    code = compile(source, str(Path(__file__).resolve()), "exec")
except Exception as error:
    raise SystemExit(f"Recovered Estimate materializer is invalid: {error}") from error

namespace = {
    "__file__": str(Path(__file__).resolve()),
    "__name__": "__estimate_sale_fast_entry_materializer__",
}
exec(code, namespace, namespace)
print(f"ESTIMATE_SALE_FAST_ENTRY_MATERIALIZATION_COMPLETE bytes={len(source)}")
