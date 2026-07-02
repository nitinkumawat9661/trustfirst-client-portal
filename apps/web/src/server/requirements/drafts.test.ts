import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { PrismaRequirementRepository } from "./requirement-repository";

describe("Requirement drafts", () => {
  it("calculates the next draft revision", async () => {
    const repository = new PrismaRequirementRepository({
      requirementDraft: {
        findFirst: async () => ({ revision: 7 }),
      },
    } as unknown as PrismaClient);

    await expect(repository.nextDraftRevision("req_1")).resolves.toBe(8);
  });
});

