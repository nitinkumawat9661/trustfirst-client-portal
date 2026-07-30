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
    PARTS_DIR / "bridge-02-03.b64",
    PARTS_DIR / "part-03.b64",
    PARTS_DIR / "part-04.b64",
    PARTS_DIR / "part-05.b64",
    PARTS_DIR / "part-06.b64",
]
missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
if missing:
    raise SystemExit("Missing Estimate Sale recovery chunks: " + ", ".join(missing))

# The first two 12k chunks are an intact, quartet-aligned prefix (18,000 decoded bytes).
prefix_b64 = "".join((PARTS_DIR / name).read_text(encoding="utf-8").strip() for name in [
    "part-00.b64",
    "part-01.b64",
])
prefix = base64.b64decode(prefix_b64, validate=True)

# part-02 was captured from original Base64 offset 28,001. Skip its first three
# characters to resume on the next quartet. Its last 4,001 characters overlap the
# exact bridge, so append only the non-overlapping bridge suffix and the intact tail.
part_02 = (PARTS_DIR / "part-02.b64").read_text(encoding="utf-8").strip()
bridge = (PARTS_DIR / "bridge-02-03.b64").read_text(encoding="utf-8").strip()
tail_b64 = (
    part_02[3:]
    + bridge[4001:]
    + "".join((PARTS_DIR / name).read_text(encoding="utf-8").strip() for name in [
        "part-03.b64",
        "part-04.b64",
        "part-05.b64",
        "part-06.b64",
    ])
)
tail = base64.b64decode(tail_b64, validate=True)

# Recovered readable section between the intact prefix and tail. This is the
# Estimate form's save/confirm/edit request flow and the beginning of its header UI.
middle = r'''items,
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

source = prefix + middle + tail
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
