import {
  ClientLifecycleStage,
  ClientStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import type { Permission } from "../authorization/authorization";
import { AppError } from "../domain/errors";
import { normalizeEmail, sanitizeString } from "../security/sanitize";
import { PermissionResolverService } from "../permissions";
import { PrismaClientRepository } from "./client-repository";
import type {
  ClientDashboardMetrics,
  ClientSearchResult,
  ClientSummary,
  ClientWorkspace,
  CsvImportPreview,
  ExportPlan,
} from "./types";
import type {
  clientCommentCreateSchema,
  clientContactCreateSchema,
  clientCreateSchema,
  clientNoteCreateSchema,
  clientStatusTransitionSchema,
  clientUpdateSchema,
} from "./schemas";
import type { z } from "zod";

type ActorContext = {
  tenantId: string;
  userId: string;
};

type ClientRecord = Awaited<ReturnType<PrismaClientRepository["list"]>>[number];

const allowedTransitions: Record<ClientLifecycleStage, ClientLifecycleStage[]> = {
  [ClientLifecycleStage.LEAD]: [
    ClientLifecycleStage.PROSPECT,
    ClientLifecycleStage.CLIENT,
    ClientLifecycleStage.ARCHIVED,
  ],
  [ClientLifecycleStage.PROSPECT]: [ClientLifecycleStage.CLIENT, ClientLifecycleStage.ARCHIVED],
  [ClientLifecycleStage.CLIENT]: [ClientLifecycleStage.ARCHIVED],
  [ClientLifecycleStage.ARCHIVED]: [ClientLifecycleStage.PROSPECT, ClientLifecycleStage.CLIENT],
};

export class ClientService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaClientRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaClientRepository(prisma);
  }

  async listClients(context: ActorContext) {
    await this.permissions.enforce({
      policy: { anyOf: ["crm.read", "crm.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
    const clients = await this.repository.list(context.tenantId);
    return clients.map(toSummary);
  }

  async getDashboard(context: ActorContext): Promise<ClientDashboardMetrics> {
    await this.permissions.enforce({
      policy: { anyOf: ["crm.read", "crm.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
    const [
      activeProjects,
      pendingApprovals,
      pendingRequirements,
      openTasks,
      recentFiles,
      recentActivity,
      health,
    ] = await this.repository.dashboard(context.tenantId);

    return {
      activeProjects,
      healthScore: Math.round(health._avg.healthScore ?? 0),
      openTasks,
      pendingApprovals,
      pendingRequirements,
      recentActivity,
      recentFiles,
    };
  }

  async getWorkspace(context: ActorContext, clientId: string): Promise<ClientWorkspace> {
    await this.permissions.enforce({
      policy: { anyOf: ["crm.read", "crm.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
    const client = await this.repository.findById(context.tenantId, clientId);

    if (!client || client.deletedAt) {
      throw notFound();
    }

    const [
      activeProjects,
      pendingApprovals,
      pendingRequirements,
      openTasks,
      recentFiles,
      recentActivity,
    ] = await this.repository.workspaceCounts(context.tenantId, client.id);
    const summary = toSummary(client);

    return {
      activity: client.activities.map((event) => ({
        id: event.id,
        occurredAt: event.occurredAt,
        summary: event.summary,
        verb: event.verb,
      })),
      client: {
        ...summary,
        createdAt: client.createdAt,
        industry: client.industry,
        legalName: client.legalName,
        source: client.source,
        website: client.website,
      },
      comments: client.comments.map((comment) => ({
        body: comment.body,
        createdAt: comment.createdAt,
        id: comment.id,
        parentId: comment.parentId,
        resolvedAt: comment.resolvedAt,
      })),
      contacts: client.contacts.map((contact) => ({
        email: contact.email,
        id: contact.id,
        isPrimary: contact.isPrimary,
        lastActivityAt: contact.lastActivityAt,
        name: contact.name,
        role: contact.role,
      })),
      metrics: {
        activeProjects,
        healthScore: client.healthScore,
        openTasks,
        pendingApprovals,
        pendingRequirements,
        recentActivity,
        recentFiles,
      },
      notes: client.notes.map((note) => ({
        body: note.body,
        createdAt: note.createdAt,
        id: note.id,
        title: note.title,
      })),
    };
  }

  async createClient(
    context: ActorContext,
    input: z.infer<typeof clientCreateSchema>,
  ) {
    await this.permissions.enforce({
      policy: { anyOf: ["crm.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
    const slug = await this.uniqueSlug(context.tenantId, input.name);
    const client = await this.repository.create({
      actorId: context.userId,
      data: stripUndefined({
        customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
        healthScore: input.healthScore ?? 75,
        lifecycleStage: input.lifecycleStage ?? ClientLifecycleStage.LEAD,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        name: sanitizeString(input.name, 200),
        ownerId: input.ownerId ?? context.userId,
        slug,
        status: input.status ?? ClientStatus.NEW,
        tenantId: context.tenantId,
        accountManagerId: input.accountManagerId,
        industry: input.industry,
        legalName: input.legalName,
        source: input.source,
        website: input.website,
      }) as Prisma.ClientOrganizationUncheckedCreateInput,
      tags: input.tags ?? [],
    });
    return client;
  }

  async updateClient(
    context: ActorContext,
    clientId: string,
    input: z.infer<typeof clientUpdateSchema>,
  ) {
    await this.ensureClientAccess(context, clientId, "crm.manage");
    const current = await this.repository.findById(context.tenantId, clientId);

    if (!current || current.deletedAt) {
      throw notFound();
    }

    if (input.lifecycleStage) {
      this.assertLifecycleTransition(current.lifecycleStage, input.lifecycleStage);
    }

    return this.repository.update({
      actorId: context.userId,
      clientId,
      data: stripUndefined({
        accountManagerId: input.accountManagerId,
        customFields: input.customFields as Prisma.InputJsonValue | undefined,
        healthScore: input.healthScore,
        industry: input.industry,
        legalName: input.legalName,
        lifecycleStage: input.lifecycleStage,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        name: input.name ? sanitizeString(input.name, 200) : undefined,
        ownerId: input.ownerId,
        source: input.source,
        status: input.status,
        website: input.website,
      }) as Prisma.ClientOrganizationUncheckedUpdateInput,
      tenantId: context.tenantId,
      ...(input.tags ? { tags: input.tags } : {}),
    });
  }

  async transitionStatus(
    context: ActorContext,
    clientId: string,
    input: z.infer<typeof clientStatusTransitionSchema>,
  ) {
    const current = await this.ensureClientAccess(context, clientId, "crm.manage");

    if (input.lifecycleStage) {
      this.assertLifecycleTransition(current.lifecycleStage, input.lifecycleStage);
    }

    return this.repository.transitionStatus({
      actorId: context.userId,
      clientId,
      status: input.status,
      tenantId: context.tenantId,
      ...(input.lifecycleStage ? { lifecycleStage: input.lifecycleStage } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
    });
  }

  async archiveClient(context: ActorContext, clientId: string) {
    await this.ensureClientAccess(context, clientId, "crm.manage");
    return this.repository.archive({ actorId: context.userId, clientId, tenantId: context.tenantId });
  }

  async softDeleteClient(context: ActorContext, clientId: string) {
    await this.ensureClientAccess(context, clientId, "crm.manage");
    return this.repository.softDelete({
      actorId: context.userId,
      clientId,
      tenantId: context.tenantId,
    });
  }

  async addContact(
    context: ActorContext,
    clientId: string,
    input: z.infer<typeof clientContactCreateSchema>,
  ) {
    await this.ensureClientAccess(context, clientId, "crm.manage");
    return this.repository.createContact({
      clientId,
      data: stripUndefined({
        clientId,
        email: input.email,
        isPrimary: input.isPrimary ?? false,
        name: sanitizeString(input.name, 160),
        normalizedEmail: normalizeEmail(input.email),
        tenantId: context.tenantId,
        phone: input.phone,
        role: input.role,
        title: input.title,
      }) as Prisma.ClientContactUncheckedCreateInput,
      tenantId: context.tenantId,
    });
  }

  async addNote(
    context: ActorContext,
    clientId: string,
    input: z.infer<typeof clientNoteCreateSchema>,
  ) {
    await this.ensureClientAccess(context, clientId, "crm.manage");
    return this.repository.createNote(stripUndefined({
      authorId: context.userId,
      body: input.body,
      clientId,
      tenantId: context.tenantId,
      title: input.title,
      visibility: input.visibility ?? "internal",
    }) as Prisma.ClientNoteUncheckedCreateInput);
  }

  async addComment(
    context: ActorContext,
    clientId: string,
    input: z.infer<typeof clientCommentCreateSchema>,
  ) {
    await this.ensureClientAccess(context, clientId, "crm.read");
    return this.repository.createComment(stripUndefined({
      attachments: (input.attachments ?? []) as Prisma.InputJsonValue,
      authorId: context.userId,
      body: input.body,
      clientId,
      mentions: (input.mentions ?? []) as Prisma.InputJsonValue,
      parentId: input.parentId,
      tenantId: context.tenantId,
    }) as Prisma.ClientCommentUncheckedCreateInput);
  }

  async search(context: ActorContext, query: string): Promise<ClientSearchResult> {
    await this.permissions.enforce({
      policy: { anyOf: ["crm.read", "crm.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
    const [clients, contacts, notes, comments] = await this.repository.search(
      context.tenantId,
      query,
    );
    return {
      clients: clients.map(toSummary),
      comments: comments.map((comment) => ({
        clientId: comment.clientId,
        excerpt: comment.body.slice(0, 180),
        id: comment.id,
      })),
      contacts: contacts.map((contact) => ({
        clientId: contact.clientId,
        email: contact.email,
        id: contact.id,
        name: contact.name,
      })),
      notes: notes.map((note) => ({
        clientId: note.clientId,
        id: note.id,
        title: note.title,
      })),
    };
  }

  previewCsvImport(csv: string): CsvImportPreview {
    const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
    const headers = headerLine?.split(",").map((header) => header.trim()) ?? [];
    const rows = lines.map((line, index) => {
      const values = line.split(",");
      const normalized = Object.fromEntries(
        headers.map((header, headerIndex) => [header, values[headerIndex]?.trim() ?? ""]),
      );
      const issues = [
        !normalized.name ? "Name is required." : "",
        normalized.website && !isUrl(normalized.website) ? "Website must be a valid URL." : "",
      ].filter(Boolean);
      return { index: index + 1, issues, normalized };
    });

    return {
      invalidRows: rows.filter((row) => row.issues.length > 0).length,
      rows,
      validRows: rows.filter((row) => row.issues.length === 0).length,
    };
  }

  planExport(input: { clientId?: string; format: "csv" | "pdf"; scope: "client" | "clients" }): ExportPlan {
    return {
      contentType: input.format === "csv" ? "text/csv" : "application/pdf",
      fileName:
        input.scope === "client"
          ? `client-${input.clientId ?? "export"}.${input.format}`
          : `clients.${input.format}`,
      format: input.format,
      scope: input.scope,
    };
  }

  private async ensureClientAccess(context: ActorContext, clientId: string, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as Permission, "crm.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
    const client = await this.repository.findById(context.tenantId, clientId);

    if (!client || client.deletedAt) {
      throw notFound();
    }

    return client;
  }

  private assertLifecycleTransition(
    from: ClientLifecycleStage,
    to: ClientLifecycleStage,
  ) {
    if (from === to) {
      return;
    }

    if (!allowedTransitions[from].includes(to)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: `Client lifecycle cannot transition from ${from} to ${to}.`,
        status: 422,
      });
    }
  }

  private async uniqueSlug(tenantId: string, name: string) {
    const base = slugify(name);
    let candidate = base;
    let index = 2;

    while (await this.repository.findBySlug(tenantId, candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }

    return candidate;
  }
}

export function toSummary(client: ClientRecord): ClientSummary {
  const primaryContact = client.contacts.find((contact) => contact.isPrimary);

  return stripUndefined({
    accountManager: client.accountManager
      ? { id: client.accountManager.id, name: client.accountManager.name }
      : undefined,
    healthScore: client.healthScore,
    id: client.id,
    lifecycleStage: client.lifecycleStage,
    name: client.name,
    primaryContact: primaryContact
      ? { email: primaryContact.email, name: primaryContact.name }
      : undefined,
    slug: client.slug,
    status: client.status,
    tags: client.tagAssignments.map((assignment) => assignment.tag.name),
    updatedAt: client.updatedAt,
  }) as ClientSummary;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "Client was not found.",
    status: 404,
  });
}
