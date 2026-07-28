import {
  AuditAction,
  HardwareTimelineVerb,
  getPrisma,
} from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/domain/errors";
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

    for (const item of input.items) {
      const suggestion = suggestionMap.get(item.id);
      if (!suggestion) throw validation(`Product ${item.id} is no longer a safe rename candidate.`);
      if (suggestion.oldName !== item.expectedName || suggestion.newName !== item.newName) {
        throw validation(`Product ${suggestion.sku} changed after the audit was loaded. Refresh the audit before applying names.`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated: Array<{ id: string; name: string; sku: string }> = [];
      const skipped: string[] = [];

      for (const item of input.items) {
        const suggestion = suggestionMap.get(item.id);
        if (!suggestion) continue;
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

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
