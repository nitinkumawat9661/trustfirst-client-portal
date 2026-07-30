#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "apps/web/src/server/hardware/trade-service.ts"


def replace_once(content: str, old: str, new: str) -> str:
    count = content.count(old)
    if count == 1:
        return content.replace(old, new, 1)
    if count == 0 and new in content:
        return content
    raise SystemExit(f"Expected one match, found {count}: {old[:120]!r}")


def replace_count(content: str, old: str, new: str, expected: int) -> str:
    count = content.count(old)
    if count == expected:
        return content.replace(old, new)
    if count == 0 and content.count(new) >= expected:
        return content
    raise SystemExit(f"Expected {expected} matches, found {count}: {old[:120]!r}")


content = PATH.read_text(encoding="utf-8")
content = replace_once(content, "  type Prisma,\n", "  Prisma,\n")
content = replace_once(
    content,
    "function paymentModeFromMetadata(metadata: Prisma.JsonValue) {",
    "function paymentModeFromMetadata(metadata: unknown) {",
)
content = replace_once(
    content,
    "function estimatePaymentAmountFromMetadata(metadata: Prisma.JsonValue, totalCents: number) {",
    "function estimatePaymentAmountFromMetadata(metadata: unknown, totalCents: number) {",
)
content = replace_once(
    content,
    "          confirmedAt: new Date(),\n          customerId: input.customerId,\n          discountCents: totals.discountCents,",
    "          confirmedAt: new Date(),\n          customer: input.customerId\n            ? { connect: { id: input.customerId } }\n            : { disconnect: true },\n          discountCents: totals.discountCents,",
)
content = replace_once(content, "                lineTotalCents: item.totalCents,", "                lineTotalCents: line.totalCents,")
content = replace_once(
    content,
    "            customerId: input.customerId,\n            locationId: input.locationId,\n            metadata: {\n              editIdempotencyKey: input.idempotencyKey,",
    "            customerId: input.customerId ?? null,\n            locationId: input.locationId,\n            metadata: {\n              editIdempotencyKey: input.idempotencyKey,",
)
content = replace_count(content, "        partyId: input.customerId,", "        partyId: input.customerId ?? null,", 2)

PATH.write_text(content, encoding="utf-8")
print("ESTIMATE_SALE_STRICT_TYPE_FIXES_APPLIED")
