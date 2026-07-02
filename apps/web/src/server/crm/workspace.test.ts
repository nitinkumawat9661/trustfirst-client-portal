import { ClientLifecycleStage, ClientStatus } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { toSummary } from "./client-service";

describe("client workspace projection", () => {
  it("projects primary contact, tags, and manager into summaries", () => {
    const summary = toSummary({
      accountManager: { id: "user_1", name: "Asha" },
      contacts: [
        {
          email: "secondary@example.com",
          isPrimary: false,
          name: "Secondary",
        },
        {
          email: "primary@example.com",
          isPrimary: true,
          name: "Primary",
        },
      ],
      healthScore: 92,
      id: "client_1",
      lifecycleStage: ClientLifecycleStage.CLIENT,
      name: "TrustFirst",
      slug: "trustfirst",
      status: ClientStatus.ACTIVE,
      tagAssignments: [{ tag: { name: "retainer" } }],
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as Parameters<typeof toSummary>[0]);

    expect(summary.primaryContact?.email).toBe("primary@example.com");
    expect(summary.tags).toEqual(["retainer"]);
    expect(summary.accountManager?.name).toBe("Asha");
  });
});

