import {
  ProjectLifecycleStatus,
  ProjectPriority,
  ProjectTaskStatus,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "project-manager",
          permissions: [
            { permission: { key: "projects.read" } },
            { permission: { key: "projects.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const project = {
  archivedAt: null,
  attachments: [],
  calendar: {},
  clientId: null,
  deliverables: [],
  gantt: {},
  id: "project_1",
  labels: [],
  managerId: "user_1",
  milestones: [
    {
      dependencies: ["milestone_0"],
      dueAt: new Date("2026-08-01T00:00:00.000Z"),
      id: "milestone_1",
      name: "Discovery",
      progress: 30,
      status: "open",
    },
  ],
  name: "Portal Build",
  priority: ProjectPriority.MEDIUM,
  progress: 45,
  slug: "portal-build",
  status: ProjectLifecycleStatus.COMPLETED,
  targetDate: null,
  tasks: [
    {
      assigneeId: "user_2",
      dueAt: new Date("2026-08-03T00:00:00.000Z"),
      id: "task_1",
      parentId: null,
      priority: ProjectPriority.HIGH,
      status: ProjectTaskStatus.IN_PROGRESS,
      title: "Wireframe",
    },
  ],
  timeline: [],
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

describe("ProjectService", () => {
  it("rejects invalid lifecycle transitions", async () => {
    const service = new ProjectService(
      prismaMock({
        project: {
          findFirst: async () => project,
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.transitionStatus(
        { tenantId: "tenant_1", userId: "user_1" },
        "project_1",
        { status: ProjectLifecycleStatus.ACTIVE },
      ),
    ).rejects.toThrow("cannot transition");
  });

  it("projects dashboard and Gantt-ready workspace contracts", async () => {
    const service = new ProjectService(
      prismaMock({
        project: {
          findFirst: async () => ({ ...project, status: ProjectLifecycleStatus.ACTIVE }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    const workspace = await service.get(
      { tenantId: "tenant_1", userId: "user_1" },
      "project_1",
    );

    expect(workspace.metrics.tasks).toBe(1);
    expect(workspace.gantt.dependencies).toEqual([
      { from: "milestone_0", to: "milestone_1" },
    ]);
  });

  it("blocks users without project permissions", async () => {
    const service = new ProjectService(
      prismaMock({
        tenantMembership: {
          findUnique: async () => ({
            role: { key: "viewer", permissions: [{ permission: { key: "crm.read" } }] },
            status: "ACTIVE",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.dashboard({ tenantId: "tenant_1", userId: "user_1" }),
    ).rejects.toThrow("permission");
  });
});

