import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service";

describe("Project milestones", () => {
  it("marks milestone updates as complete when requested", async () => {
    let updateData: unknown;
    const service = new ProjectService({
      project: {
        findFirst: async () => ({
          archivedAt: null,
          status: "ACTIVE",
        }),
      },
      projectMilestone: {
        update: async ({ data }: { data: unknown }) => {
          updateData = data;
          return { completedAt: new Date(), id: "milestone_1", name: "Launch" };
        },
      },
      projectNotification: { create: async () => ({}) },
      projectTimelineEvent: { create: async () => ({}) },
      tenantMembership: {
        findUnique: async () => ({
          role: { key: "manager", permissions: [{ permission: { key: "projects.manage" } }] },
          status: "ACTIVE",
        }),
      },
      $transaction: async (callback: (tx: unknown) => unknown) =>
        callback({
          projectMilestone: {
            update: async ({ data }: { data: unknown }) => {
              updateData = data;
              return { completedAt: new Date(), id: "milestone_1", name: "Launch" };
            },
          },
          projectTimelineEvent: { create: async () => ({}) },
        }),
    } as unknown as PrismaClient);

    await service.updateMilestone(
      { tenantId: "tenant_1", userId: "user_1" },
      "project_1",
      "milestone_1",
      { completed: true },
    );

    expect(updateData).toMatchObject({ progress: 100, status: "completed" });
  });
});

