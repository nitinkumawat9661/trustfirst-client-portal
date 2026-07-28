import {
  AuditAction,
  HardwareTimelineVerb,
  getPrisma,
} from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/domain/errors";
import { hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";
import { PermissionResolverService } from "@/server/permissions";

const nameCleanupSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  updates: z.array(z.object({
    name: z.string().trim().min(2).max(240),
    sku: z.string().trim().min(1).max(120),
  })).min(1).max(50),
}).superRefine((input, context) => {
  const seen = new Set<string>();
  input.updates.forEach((update, index) => {
    const key = update.sku.toLowerCase();
    if (seen.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate SKU ${update.sku} in request.`,
        path: ["updates", index, "sku"],
      });
    }
    seen.add(key);
  });
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

    const input = await parseHardwareJson(request, nameCleanupSchema);
    const products = await prisma.hardwareProduct.findMany({
      select: { id: true, name: true, sku: true },
      where: {
        archivedAt: null,
        sku: { in: input.updates.map((update) => update.sku) },
        tenantId,
      },
    });
    const productsBySku = new Map(products.map((product) => [product.sku.toLowerCase(), product]));
    const missingSkus = input.updates
      .filter((update) => !productsBySku.has(update.sku.toLowerCase()))
      .map((update) => update.sku);
    if (missingSkus.length) {
      throw validation(`Products were not found for SKU: ${missingSkus.slice(0, 10).join(", ")}${missingSkus.length > 10 ? "..." : ""}`);
    }

    const changed = input.updates.filter((update) => {
      const product = productsBySku.get(update.sku.toLowerCase());
      return product && product.name !== update.name;
    });

    if (input.dryRun) {
      return hardwareResponse({
        changed: changed.length,
        dryRun: true,
        requested: input.updates.length,
        unchanged: input.updates.length - changed.length,
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const update of changed) {
        const existing = productsBySku.get(update.sku.toLowerCase());
        if (!existing) continue;
        await tx.hardwareProduct.update({
          data: { name: update.name },
          where: { id: existing.id },
        });
        await tx.hardwareTimelineEvent.create({
          data: {
            actorId: user.id,
            productId: existing.id,
            summary: `Renamed product ${existing.sku}`,
            tenantId,
            verb: HardwareTimelineVerb.PRODUCT_UPDATED,
          },
        });
        await tx.auditEvent.create({
          data: {
            action: AuditAction.HARDWARE_CATALOG_UPDATED,
            actorId: user.id,
            metadata: {
              editableFields: ["name"],
              newName: update.name,
              oldName: existing.name,
              source: "catalog-name-cleanup",
              sku: existing.sku,
            },
            targetId: existing.id,
            targetType: "HardwareProduct",
            tenantId,
          },
        });
      }
    });

    return hardwareResponse({
      dryRun: false,
      requested: input.updates.length,
      skipped: input.updates.length - changed.length,
      updated: changed.length,
    });
  } catch (error) {
    return hardwareError(error);
  }
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
