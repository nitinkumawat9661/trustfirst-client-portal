#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "apps/web/src/server/hardware/trade-service.ts"


def replace_once(content: str, old: str, new: str) -> str:
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match, found {count}: {old[:140]!r}")
    return content.replace(old, new, 1)


content = PATH.read_text(encoding="utf-8")
content = replace_once(
    content,
    '''    await this.enforce(context, "hardware.sales.manage");
    await this.ensureLocation(context.tenantId, input.locationId);
    const isEstimateSale = document.type === HardwareTradeDocumentType.SALES_QUOTATION;
''',
    '''    await this.enforce(context, "hardware.sales.manage");
    const isEstimateSale = document.type === HardwareTradeDocumentType.SALES_QUOTATION;
    if (!isEstimateSale) {
      if (!input.locationId) {
        throw validation("A stock location is required to cancel a normal sale.");
      }
      await this.ensureLocation(context.tenantId, input.locationId);
    }
''',
)
content = replace_once(
    content,
    '''    const estimateMetadata = asRecord(document.metadata);
    const estimateVersion = readString(estimateMetadata.estimateSaleVersion);
''',
    '''    const estimateMetadata = asRecord(document.metadata);
    const estimateVersion = readString(estimateMetadata.estimateSaleVersion);
    const fallbackLocationId = input.locationId ?? readString(estimateMetadata.stockLocationId);
''',
)
content = replace_once(
    content,
    '''        locationId: input.locationId,
        reason: input.reason,
''',
    '''        locationId: fallbackLocationId,
        reason: input.reason,
''',
)
content = replace_once(
    content,
    '''        } else {
          for (const item of document.items.filter((candidate) => !isStockSetupPending(candidate.product?.metadata))) {
''',
    '''        } else {
          if (!fallbackLocationId) {
            throw validation("Stock location for cancellation could not be resolved.");
          }
          for (const item of document.items.filter((candidate) => !isStockSetupPending(candidate.product?.metadata))) {
''',
)
content = replace_once(
    content,
    '''                locationId: input.locationId,
                metadata: {
                  cancelledDocumentNumber: document.documentNumber,
''',
    '''                locationId: fallbackLocationId,
                metadata: {
                  cancelledDocumentNumber: document.documentNumber,
''',
)
PATH.write_text(content, encoding="utf-8")
print("ESTIMATE_CANCEL_LOCATION_FIX_APPLIED")
