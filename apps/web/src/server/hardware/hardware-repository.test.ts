import type { Prisma, PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import {
  hardwareInventoryMovementChronology,
  PrismaHardwareRepository,
} from "./hardware-repository";

describe("PrismaHardwareRepository inventory chronology", () => {
  it("loads product and tenant movement histories oldest first", async () => {
    const queries: Prisma.HardwareInventoryMovementFindManyArgs[] = [];
    const prisma = {
      hardwareInventoryMovement: {
        findMany: async (query: Prisma.HardwareInventoryMovementFindManyArgs) => {
          queries.push(query);
          return [];
        },
      },
    } as unknown as PrismaClient;
    const repository = new PrismaHardwareRepository(prisma);

    await repository.movementsForProduct("tenant-1", "product-1");
    await repository.allMovements("tenant-1");

    expect(hardwareInventoryMovementChronology).toEqual([
      { occurredAt: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ]);
    expect(queries).toHaveLength(2);
    expect(queries[0]?.orderBy).toEqual(hardwareInventoryMovementChronology);
    expect(queries[1]?.orderBy).toEqual(hardwareInventoryMovementChronology);
  });
});
