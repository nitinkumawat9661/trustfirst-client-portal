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
  businessName: string;
  clientSlug: string;
  possibleDuplicate: boolean;
  status: RequirementStatus;
  submittedAt: Date;
  submissionNumber: string;
};

export type PublicIntakeQueueItem = {
  businessName: string;
  clientSlug: string;
  clientName: string | null;
  contactName: string;
  createdAt: Date;
  id: string;
  mobile: string;
  possibleDuplicate: boolean;
  priority: string;
  reviewed: boolean;
  source: string;
  status: string;
  submittedAt: Date | null;
  submissionNumber: string;
  title: string;
  updatedAt: Date;
};

export type PublicIntakeReceipt = {
  businessName: string;
  clientSlug: string;
  possibleDuplicate: boolean;
  status: string;
  submittedAt: Date;
  submissionNumber: string;
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

    const [submissionNumber, duplicate] = await Promise.all([
      this.nextSubmissionNumber(tenant.id),
      this.findPossibleDuplicate(tenant.id, input),
    ]);
    const submittedAt = new Date();
    const submittedData = input as unknown as Prisma.InputJsonValue;
    const intakeMetadata = {
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      duplicateOfSubmission: duplicate?.submissionNumber ?? null,
      ipHash: metadata.ipAddress ? hashValue(metadata.ipAddress) : null,
      possibleDuplicate: Boolean(duplicate),
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
            clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
            ipHash: metadata.ipAddress ? hashValue(metadata.ipAddress) : null,
            possibleDuplicate: Boolean(duplicate),
            receiptLog: true,
            source: PUBLIC_INTAKE_SOURCE,
            status: RequirementStatus.PENDING,
            submissionNumber,
            userAgent: metadata.userAgent?.slice(0, 300) ?? null,
          },
          requirementId: requirement.id,
          summary: `Receipt logged for public intake ${submissionNumber}`,
          tenantId: tenant.id,
          verb: RequirementTimelineVerb.SUBMITTED,
        },
      });
    });

    return {
      businessName: input.company.firmName,
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      possibleDuplicate: Boolean(duplicate),
      status: RequirementStatus.PENDING,
      submittedAt,
      submissionNumber,
    };
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
        businessName: data?.company?.firmName ?? record.client?.name ?? "Not provided",
        clientSlug: String(metadata.clientSlug ?? MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG),
        clientName: record.client?.name ?? null,
        contactName: data?.company?.contactName ?? "Not provided",
        createdAt: record.createdAt,
        id: record.id,
        mobile: data?.company?.phone ?? "Not provided",
        possibleDuplicate: metadata.possibleDuplicate === true,
        priority: record.priority,
        reviewed: metadata.reviewed === true,
        source: String(metadata.source ?? PUBLIC_INTAKE_SOURCE),
        status: record.status,
        submittedAt: record.submittedAt,
        submissionNumber: String(metadata.submissionNumber ?? record.id),
        title: record.title,
        updatedAt: record.updatedAt,
      };
    });
  }

  async getReceiptBySubmissionNumber(submissionNumber: string): Promise<PublicIntakeReceipt | null> {
    const tenant = await this.prisma.tenant.findUnique({
      select: { id: true },
      where: { slug: MANGLAM_PUBLIC_INTAKE_TENANT_SLUG },
    });
    if (!tenant) return null;

    const record = await this.prisma.requirement.findFirst({
      select: {
        metadata: true,
        status: true,
        submittedAt: true,
        submittedData: true,
      },
      where: {
        metadata: {
          path: ["submissionNumber"],
          equals: submissionNumber,
        },
        tenantId: tenant.id,
      },
    });

    if (!record?.submittedAt) return null;

    const data = record.submittedData as Partial<ManglamPublicIntakeInput> | null;
    const metadata = record.metadata as Record<string, unknown>;

    if (metadata.source !== PUBLIC_INTAKE_SOURCE) return null;
    if (metadata.clientSlug !== MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG) return null;

    return {
      businessName: data?.company?.firmName ?? "MANGALAM SANITARY",
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      possibleDuplicate: metadata.possibleDuplicate === true,
      status: record.status,
      submittedAt: record.submittedAt,
      submissionNumber,
    };
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

  private async findPossibleDuplicate(tenantId: string, input: ManglamPublicIntakeInput) {
    const recent = await this.prisma.requirement.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        metadata: true,
        submittedData: true,
      },
      take: 25,
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000),
        },
        metadata: { path: ["source"], equals: PUBLIC_INTAKE_SOURCE },
        tenantId,
      },
    });

    const normalizedFirm = normalizeDuplicateValue(input.company.firmName);
    const normalizedPhone = normalizeDuplicateValue(input.company.phone);

    for (const record of recent) {
      const data = record.submittedData as Partial<ManglamPublicIntakeInput> | null;
      const metadata = record.metadata as Record<string, unknown>;
      if (
        normalizeDuplicateValue(data?.company?.firmName) === normalizedFirm &&
        normalizeDuplicateValue(data?.company?.phone) === normalizedPhone
      ) {
        return {
          submissionNumber: String(metadata.submissionNumber ?? ""),
        };
      }
    }

    return null;
  }
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeDuplicateValue(value: string | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
