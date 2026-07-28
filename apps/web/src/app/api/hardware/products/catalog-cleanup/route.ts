import {
  AuditAction,
  HardwareTimelineVerb,
  getPrisma,
} from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/session";
import {
  HardwareService,
  buildCatalogAudit,
  hardwareError,
  hardwareResponse,
  parseHardwareJson,
} from "@/server/hardware";
import { PermissionResolverService } from "@/server/permissions";

const catalogCleanupSchema = z.object({
  confirmation: z.literal("RENAME"),
  items: z.array(z.object({
    expectedName: z.string().min(1).max(240),
    id: z.string().min(1),
    newName: z.string().min(1).max(240),
  })).min(1).max(25),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const tenantId = user.activeTenantId ?? "public";
    const prisma = getPrisma();
    const permissions = new PermissionResolverService(prisma);
    await permissions.enforce({
      policy: { anyOf: ["hardware.catalog.manage", "hardware.plugin.manage", "*"] },
      tenantId,
      userId: user.id,
    });

    const input = await parseHardwareJson(request, catalogCleanupSchema);
    const service = new HardwareService(prisma);
    const products = await service.listProducts({ tenantId, userId: user.id });
    const suggestionMap = new Map(buildCatalogAudit(products).suggestions.map((suggestion) => [suggestion.id, suggestion]));
    const eligible: Array<{
      item: (typeof input.items)[number];
      suggestion: NonNullable<ReturnType<typeof suggestionMap.get>>;
    }> = [];
    const preSkipped: string[] = [];

    for (const item of input.items) {
      const suggestion = suggestionMap.get(item.id);
      if (!suggestion) {
        preSkipped.push(item.id);
        continue;
      }
      if (suggestion.oldName !== item.expectedName || suggestion.newName !== item.newName) {
        preSkipped.push(item.id);
        continue;
      }
      eligible.push({ item, suggestion });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated: Array<{ id: string; name: string; sku: string }> = [];
      const skipped = [...preSkipped];

      for (const { item, suggestion } of eligible) {
        const update = await tx.hardwareProduct.updateMany({
          data: { name: item.newName },
          where: {
            archivedAt: null,
            id: item.id,
            name: item.expectedName,
            tenantId,
          },
        });
        if (update.count === 1) updated.push({ id: item.id, name: item.newName, sku: suggestion.sku });
        else skipped.push(item.id);
      }

      if (updated.length) {
        await tx.hardwareTimelineEvent.createMany({
          data: updated.map((product) => ({
            actorId: user.id,
            productId: product.id,
            summary: `Improved duplicate product display name for ${product.sku}`,
            tenantId,
            verb: HardwareTimelineVerb.PRODUCT_UPDATED,
          })),
        });
        await tx.auditEvent.create({
          data: {
            action: AuditAction.HARDWARE_CATALOG_UPDATED,
            actorId: user.id,
            metadata: {
              operation: "safe_duplicate_name_cleanup",
              productIds: updated.map((product) => product.id),
              skippedCount: skipped.length,
              updatedCount: updated.length,
            },
            targetId: tenantId,
            targetType: "HardwareProductBatch",
            tenantId,
          },
        });
      }

      return { skipped, updated };
    });

    return hardwareResponse(result);
  } catch (error) {
    return hardwareError(error);
  }
}
