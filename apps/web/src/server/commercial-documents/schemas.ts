import {
  CommercialDocumentStatus,
  CommercialDocumentType,
} from "@trustfirst/database";
import { z } from "zod";

export const implementedDocumentTypes = [
  CommercialDocumentType.QUOTATION,
  CommercialDocumentType.PROPOSAL,
  CommercialDocumentType.ESTIMATE,
  CommercialDocumentType.AGREEMENT,
  CommercialDocumentType.WORK_ORDER,
  CommercialDocumentType.RECEIPT,
] as const;

const jsonRecord = z.record(z.string(), z.unknown());

export const commercialDocumentCreateSchema = z.object({
  branding: jsonRecord.optional(),
  clientId: z.string().optional(),
  content: jsonRecord.optional(),
  metadata: jsonRecord.optional(),
  projectId: z.string().optional(),
  requirementId: z.string().optional(),
  summary: z.string().max(5000).optional(),
  templateKey: z.string().min(1).max(120),
  title: z.string().min(3).max(240),
  type: z.enum(implementedDocumentTypes),
});

export const commercialDocumentUpdateSchema = commercialDocumentCreateSchema
  .partial()
  .omit({ type: true });

export const commercialDocumentApprovalSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const commercialDocumentCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
  parentId: z.string().optional(),
});

export const commercialDocumentAttachmentSchema = z.object({
  mimeType: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().min(1).max(500),
  version: z.number().int().positive().optional(),
});

export const commercialDocumentSearchSchema = z.object({
  q: z.string().min(1).max(120),
});

export const commercialDocumentExportSchema = z.object({
  status: z.nativeEnum(CommercialDocumentStatus).optional(),
  type: z.nativeEnum(CommercialDocumentType).optional(),
});

export type CommercialDocumentCreateInput = z.infer<
  typeof commercialDocumentCreateSchema
>;
export type CommercialDocumentUpdateInput = z.infer<
  typeof commercialDocumentUpdateSchema
>;
export type CommercialDocumentApprovalInput = z.infer<
  typeof commercialDocumentApprovalSchema
>;
export type CommercialDocumentCommentInput = z.infer<
  typeof commercialDocumentCommentSchema
>;
export type CommercialDocumentAttachmentInput = z.infer<
  typeof commercialDocumentAttachmentSchema
>;
