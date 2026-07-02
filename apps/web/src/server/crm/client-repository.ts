import {
  ClientActivityVerb,
  ClientLifecycleStage,
  ClientStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { normalizeEmail } from "../security/sanitize";

const clientInclude = {
  accountManager: { select: { id: true, name: true } },
  contacts: { orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }] },
  tagAssignments: { include: { tag: true } },
};

export class PrismaClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string) {
    return this.prisma.clientOrganization.findMany({
      include: clientInclude,
      orderBy: { updatedAt: "desc" },
      where: { deletedAt: null, tenantId },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.clientOrganization.findFirst({
      include: {
        ...clientInclude,
        activities: { orderBy: { occurredAt: "desc" }, take: 20 },
        comments: { orderBy: { createdAt: "desc" }, take: 20 },
        notes: { orderBy: { createdAt: "desc" }, take: 20 },
      },
      where: { id, tenantId },
    });
  }

  findBySlug(tenantId: string, slug: string) {
    return this.prisma.clientOrganization.findUnique({
      where: { tenantId_slug: { slug, tenantId } },
    });
  }

  async create(input: {
    actorId: string;
    data: Prisma.ClientOrganizationUncheckedCreateInput;
    tags: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.clientOrganization.create({ data: input.data });
      await this.replaceTags(tx, input.data.tenantId, client.id, input.tags);
      await tx.clientActivityEvent.create({
        data: {
          actorId: input.actorId,
          clientId: client.id,
          summary: `Created client ${client.name}`,
          tenantId: input.data.tenantId,
          verb: ClientActivityVerb.CREATED,
        },
      });
      return client;
    });
  }

  async update(input: {
    actorId: string;
    clientId: string;
    data: Prisma.ClientOrganizationUncheckedUpdateInput;
    tags?: string[];
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.clientOrganization.update({
        data: input.data,
        where: { id: input.clientId },
      });
      if (input.tags) {
        await this.replaceTags(tx, input.tenantId, client.id, input.tags);
      }
      await tx.clientActivityEvent.create({
        data: {
          actorId: input.actorId,
          clientId: client.id,
          summary: `Updated client ${client.name}`,
          tenantId: input.tenantId,
          verb: ClientActivityVerb.UPDATED,
        },
      });
      return client;
    });
  }

  transitionStatus(input: {
    actorId: string;
    clientId: string;
    lifecycleStage?: ClientLifecycleStage;
    reason?: string;
    status: ClientStatus;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.clientOrganization.update({
        data: {
          status: input.status,
          ...(input.lifecycleStage ? { lifecycleStage: input.lifecycleStage } : {}),
        },
        where: { id: input.clientId },
      });
      await tx.clientActivityEvent.create({
        data: {
          actorId: input.actorId,
          clientId: client.id,
          metadata: input.reason ? { reason: input.reason } : {},
          summary: `Changed status to ${input.status}`,
          tenantId: input.tenantId,
          verb: ClientActivityVerb.STATUS_CHANGED,
        },
      });
      return client;
    });
  }

  archive(input: { actorId: string; clientId: string; tenantId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.clientOrganization.update({
        data: {
          archivedAt: new Date(),
          archivedById: input.actorId,
          lifecycleStage: ClientLifecycleStage.ARCHIVED,
          status: ClientStatus.ARCHIVED,
        },
        where: { id: input.clientId },
      });
      await tx.clientActivityEvent.create({
        data: {
          actorId: input.actorId,
          clientId: client.id,
          summary: `Archived client ${client.name}`,
          tenantId: input.tenantId,
          verb: ClientActivityVerb.ARCHIVED,
        },
      });
      return client;
    });
  }

  softDelete(input: { actorId: string; clientId: string; tenantId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.clientOrganization.update({
        data: {
          deletedAt: new Date(),
          deletedById: input.actorId,
          status: ClientStatus.SOFT_DELETED,
        },
        where: { id: input.clientId },
      });
      await tx.clientActivityEvent.create({
        data: {
          actorId: input.actorId,
          clientId: client.id,
          summary: `Soft deleted client ${client.name}`,
          tenantId: input.tenantId,
          verb: ClientActivityVerb.DELETED,
        },
      });
      return client;
    });
  }

  dashboard(tenantId: string) {
    return Promise.all([
      this.prisma.clientProject.count({ where: { status: "active", tenantId } }),
      this.prisma.clientApproval.count({ where: { status: "pending", tenantId } }),
      this.prisma.clientRequirement.count({ where: { status: "pending", tenantId } }),
      this.prisma.clientTask.count({ where: { status: "open", tenantId } }),
      this.prisma.clientFile.count({ where: { tenantId } }),
      this.prisma.clientActivityEvent.count({ where: { tenantId } }),
      this.prisma.clientOrganization.aggregate({
        _avg: { healthScore: true },
        where: { deletedAt: null, tenantId },
      }),
    ]);
  }

  workspaceCounts(tenantId: string, clientId: string) {
    return Promise.all([
      this.prisma.clientProject.count({ where: { clientId, status: "active", tenantId } }),
      this.prisma.clientApproval.count({ where: { clientId, status: "pending", tenantId } }),
      this.prisma.clientRequirement.count({
        where: { clientId, status: "pending", tenantId },
      }),
      this.prisma.clientTask.count({ where: { clientId, status: "open", tenantId } }),
      this.prisma.clientFile.count({ where: { clientId, tenantId } }),
      this.prisma.clientActivityEvent.count({ where: { clientId, tenantId } }),
    ]);
  }

  createContact(input: {
    clientId: string;
    data: Prisma.ClientContactUncheckedCreateInput;
    tenantId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (input.data.isPrimary) {
        await tx.clientContact.updateMany({
          data: { isPrimary: false },
          where: { clientId: input.clientId, tenantId: input.tenantId },
        });
      }
      const contact = await tx.clientContact.create({ data: input.data });
      await tx.clientActivityEvent.create({
        data: {
          clientId: input.clientId,
          summary: `Added contact ${contact.name}`,
          tenantId: input.tenantId,
          verb: ClientActivityVerb.UPDATED,
        },
      });
      return contact;
    });
  }

  createNote(input: Prisma.ClientNoteUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.clientNote.create({ data: input });
      await tx.clientActivityEvent.create({
        data: {
          clientId: input.clientId,
          summary: `Added note ${note.title ?? "Untitled"}`,
          tenantId: input.tenantId,
          verb: ClientActivityVerb.UPDATED,
          ...(input.authorId ? { actorId: input.authorId } : {}),
        },
      });
      return note;
    });
  }

  createComment(input: Prisma.ClientCommentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.clientComment.create({ data: input });
      await tx.clientActivityEvent.create({
        data: {
          clientId: input.clientId,
          summary: "Added comment",
          tenantId: input.tenantId,
          verb: ClientActivityVerb.COMMENTED,
          ...(input.authorId ? { actorId: input.authorId } : {}),
        },
      });
      return comment;
    });
  }

  resolveComment(tenantId: string, id: string, resolvedById: string) {
    return this.prisma.clientComment.update({
      data: { resolvedAt: new Date(), resolvedById },
      where: { id, tenantId },
    });
  }

  search(tenantId: string, query: string) {
    const contains = query.trim();
    return Promise.all([
      this.prisma.clientOrganization.findMany({
        include: clientInclude,
        take: 20,
        where: {
          deletedAt: null,
          tenantId,
          OR: [
            { name: { contains, mode: "insensitive" } },
            { legalName: { contains, mode: "insensitive" } },
          ],
        },
      }),
      this.prisma.clientContact.findMany({
        take: 20,
        where: {
          tenantId,
          OR: [
            { name: { contains, mode: "insensitive" } },
            { normalizedEmail: { contains: normalizeEmail(contains), mode: "insensitive" } },
          ],
        },
      }),
      this.prisma.clientNote.findMany({
        take: 20,
        where: {
          tenantId,
          OR: [
            { title: { contains, mode: "insensitive" } },
            { body: { contains, mode: "insensitive" } },
          ],
        },
      }),
      this.prisma.clientComment.findMany({
        take: 20,
        where: { body: { contains, mode: "insensitive" }, tenantId },
      }),
    ]);
  }

  private async replaceTags(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    tags: string[],
  ) {
    await tx.clientTagAssignment.deleteMany({ where: { clientId } });
    for (const name of [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]) {
      const tag = await tx.clientTag.upsert({
        create: { name, tenantId },
        update: {},
        where: { tenantId_name: { name, tenantId } },
      });
      await tx.clientTagAssignment.create({ data: { clientId, tagId: tag.id } });
    }
  }
}
