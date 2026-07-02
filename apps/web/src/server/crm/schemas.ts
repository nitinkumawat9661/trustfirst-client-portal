import { ClientLifecycleStage, ClientStatus } from "@trustfirst/database";
import { z } from "zod";

export const clientCreateSchema = z.object({
  accountManagerId: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  healthScore: z.number().int().min(0).max(100).optional(),
  industry: z.string().max(120).optional(),
  legalName: z.string().max(200).optional(),
  lifecycleStage: z.nativeEnum(ClientLifecycleStage).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(2).max(200),
  ownerId: z.string().optional(),
  source: z.string().max(120).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  tags: z.array(z.string().min(1).max(60)).optional(),
  website: z.string().url().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial().extend({
  lifecycleStage: z.nativeEnum(ClientLifecycleStage).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

export const clientStatusTransitionSchema = z.object({
  lifecycleStage: z.nativeEnum(ClientLifecycleStage).optional(),
  reason: z.string().max(500).optional(),
  status: z.nativeEnum(ClientStatus),
});

export const clientContactCreateSchema = z.object({
  email: z.string().email().max(254),
  isPrimary: z.boolean().optional(),
  name: z.string().min(2).max(160),
  phone: z.string().max(60).optional(),
  role: z.string().max(100).optional(),
  title: z.string().max(120).optional(),
});

export const clientCommentCreateSchema = z.object({
  attachments: z.array(z.record(z.string(), z.unknown())).optional(),
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
  parentId: z.string().optional(),
});

export const clientNoteCreateSchema = z.object({
  body: z.string().min(1).max(12000),
  title: z.string().max(160).optional(),
  visibility: z.enum(["internal", "client"]).optional(),
});

export const clientSearchSchema = z.object({
  q: z.string().min(1).max(100),
});

export const csvImportPreviewSchema = z.object({
  csv: z.string().min(1).max(1_000_000),
});

export const exportPlanSchema = z.object({
  format: z.enum(["csv", "pdf"]),
  scope: z.enum(["clients", "client"]),
});

