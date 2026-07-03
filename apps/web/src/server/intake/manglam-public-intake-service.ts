import {
  RequirementPriority,
  RequirementStatus,
  RequirementTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { createHash } from "node:crypto";
import {
  type ManglamPublicIntakeInput,
  manglamIntakeSections,
} from "../../features/intake/manglam-intake-schema";
import { AppError } from "../domain/errors";

export const MANGLAM_PUBLIC_INTAKE_TENANT_SLUG = "manglam-trading-demo";
export const MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG = "manglam-trading-demo";
export const PUBLIC_INTAKE_SOURCE = "public-intake";

export type PublicIntakeSubmitMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type PublicIntakeSubmissionResult = {
  submissionNumber: string;
};

export type PublicIntakeQueueItem = {
  clientName: string | null;
  contactName: string;
  createdAt: Date;
  id: string;
  priority: string;
  reviewed: boolean;
  status: string;
  submissionNumber: string;
  title: string;
  updatedAt: Date;
};

export class ManglamPublicIntakeService {
  constructor(private readonly prisma: PrismaClient) {}

  async submit(
    input: ManglamPublicIntakeInput,
    metadata: PublicIntakeSubmitMetadata = {},
  ): Promise<PublicIntakeSubmissionResult> {
    const tenant = await this.prisma.tenant.findUnique({
      select: { id: true },
      where: { slug: MANGLAM_PUBLIC_INTAKE_TENANT_SLUG },
    });

    if (!tenant) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The Manglam demo tenant is not configured.",
        status: 404,
      });
    }

    const client = await this.prisma.clientOrganization.upsert({
      create: {
        industry: "Hardware and sanitary",
        lifecycleStage: "CLIENT",
        metadata: {
          intakeClient: true,
          seedProfile: "manglam-demo",
          source: PUBLIC_INTAKE_SOURCE,
        },
        name: input.company.firmName,
        slug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
        source: PUBLIC_INTAKE_SOURCE,
        status: "ACTIVE",
        tenantId: tenant.id,
      },
      update: {
        industry: "Hardware and sanitary",
        metadata: {
          intakeClient: true,
          seedProfile: "manglam-demo",
          source: PUBLIC_INTAKE_SOURCE,
        },
        name: input.company.firmName,
        source: PUBLIC_INTAKE_SOURCE,
        status: "ACTIVE",
      },
      where: {
        tenantId_slug: {
          slug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
          tenantId: tenant.id,
        },
      },
    });

    const submissionNumber = await this.nextSubmissionNumber(tenant.id);
    const submittedAt = new Date();
    const submittedData = input as unknown as Prisma.InputJsonValue;
    const intakeMetadata = {
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      ipHash: metadata.ipAddress ? hashValue(metadata.ipAddress) : null,
      publicIntake: true,
      reviewed: false,
      source: PUBLIC_INTAKE_SOURCE,
      statusLabel: "New Requirement Submitted",
      submissionNumber,
      userAgent: metadata.userAgent?.slice(0, 300) ?? null,
    };

    await this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.create({
        data: {
          clientId: client.id,
          currentVersion: 1,
          draftData: submittedData,
          formSchema: {
            intake: "manglam-public-requirement",
            sections: manglamIntakeSections,
            version: 1,
          },
          metadata: intakeMetadata,
          priority: RequirementPriority.HIGH,
          status: RequirementStatus.PENDING,
          submittedAt,
          submittedData,
          summary: input.notes.successCriteria,
          tenantId: tenant.id,
          title: `Public intake - ${input.company.firmName}`,
        },
      });

      await tx.requirementVersion.create({
        data: {
          data: submittedData,
          requirementId: requirement.id,
          summary: "Public intake submission",
          tenantId: tenant.id,
          version: 1,
        },
      });

      await tx.requirementTimelineEvent.create({
        data: {
          metadata: {
            source: PUBLIC_INTAKE_SOURCE,
            submissionNumber,
          },
          requirementId: requirement.id,
          summary: "New requirement submitted from public intake",
          tenantId: tenant.id,
          verb: RequirementTimelineVerb.SUBMITTED,
        },
      });
    });

    return { submissionNumber };
  }

  async listQueue(tenantId: string): Promise<PublicIntakeQueueItem[]> {
    const records = await this.prisma.requirement.findMany({
      include: {
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      where: {
        metadata: { path: ["source"], equals: PUBLIC_INTAKE_SOURCE },
        tenantId,
      },
    });

    return records.map((record) => {
      const data = record.submittedData as Partial<ManglamPublicIntakeInput> | null;
      const metadata = record.metadata as Record<string, unknown>;

      return {
        clientName: record.client?.name ?? null,
        contactName: data?.company?.contactName ?? "Not provided",
        createdAt: record.createdAt,
        id: record.id,
        priority: record.priority,
        reviewed: metadata.reviewed === true,
        status: record.status,
        submissionNumber: String(metadata.submissionNumber ?? record.id),
        title: record.title,
        updatedAt: record.updatedAt,
      };
    });
  }

  async getQueueItem(tenantId: string, requirementId: string) {
    return this.prisma.requirement.findFirst({
      include: {
        client: { select: { name: true, slug: true } },
        timeline: { orderBy: { occurredAt: "desc" }, take: 10 },
      },
      where: {
        id: requirementId,
        metadata: { path: ["source"], equals: PUBLIC_INTAKE_SOURCE },
        tenantId,
      },
    });
  }

  async markReviewed(tenantId: string, requirementId: string, actorId: string) {
    const existing = await this.prisma.requirement.findFirst({
      select: { metadata: true },
      where: {
        id: requirementId,
        metadata: { path: ["source"], equals: PUBLIC_INTAKE_SOURCE },
        tenantId,
      },
    });

    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Intake submission was not found.",
        status: 404,
      });
    }

    const metadata = {
      ...(existing.metadata as Record<string, unknown>),
      reviewed: true,
      reviewedAt: new Date().toISOString(),
      reviewedById: actorId,
    };

    return this.prisma.$transaction(async (tx) => {
      const requirement = await tx.requirement.update({
        data: { metadata },
        where: { id: requirementId },
      });

      await tx.requirementTimelineEvent.create({
        data: {
          actorId,
          metadata: { source: PUBLIC_INTAKE_SOURCE },
          requirementId,
          summary: "Marked public intake submission as reviewed",
          tenantId,
          verb: RequirementTimelineVerb.REVIEW_REQUESTED,
        },
      });

      return requirement;
    });
  }

  private async nextSubmissionNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.requirement.count({
      where: {
        metadata: { path: ["source"], equals: PUBLIC_INTAKE_SOURCE },
        tenantId,
      },
    });

    return `PUB-REQ-${year}-${String(count + 1).padStart(4, "0")}`;
  }
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
