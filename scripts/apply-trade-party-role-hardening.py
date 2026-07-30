#!/usr/bin/env python3
from pathlib import Path

path = Path("apps/web/src/server/hardware/trade-service.ts")
source = path.read_text(encoding="utf-8")
old = '''    const record = await this.prisma.clientOrganization.findFirst({
      select: { customFields: true },
      where: { archivedAt: null, deletedAt: null, id, tenantId },
    });
    if (!record || asRecord(record.customFields).hardwarePartyRole !== role) {
      throw validation(message);
    }'''
new = '''    const record = await this.prisma.clientOrganization.findFirst({
      select: { customFields: true },
      where: { archivedAt: null, deletedAt: null, id, tenantId },
    });
    const customFields = asRecord(record?.customFields);
    const roles = Array.isArray(customFields.hardwarePartyRoles)
      ? customFields.hardwarePartyRoles.filter(
          (candidate): candidate is "customer" | "supplier" =>
            candidate === "customer" || candidate === "supplier",
        )
      : [];
    const legacyRole = readString(customFields.hardwarePartyRole);
    if (!record || (!roles.includes(role) && legacyRole !== role)) {
      throw validation(message);
    }'''
if new not in source:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one trade party validation block, found {count}.")
    source = source.replace(old, new, 1)
path.write_text(source, encoding="utf-8")
print("TRADE_PARTY_ROLE_HARDENING_APPLIED")
