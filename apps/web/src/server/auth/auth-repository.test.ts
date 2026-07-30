import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it, vi } from "vitest";
import { PrismaAuthRepository } from "./auth-repository";

describe("PrismaAuthRepository", () => {
  it("loads only one active membership when authorizing credentials", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = {
      user: {
        findUnique,
      },
    } as unknown as PrismaClient;
    const repository = new PrismaAuthRepository(prisma);

    await repository.findUserByEmail("owner@example.com");

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          tenantMemberships: expect.objectContaining({
            orderBy: { createdAt: "asc" },
            take: 1,
            where: expect.objectContaining({
              status: "ACTIVE",
            }),
          }),
        }),
        where: {
          normalizedEmail: "owner@example.com",
        },
      }),
    );
  });
});
