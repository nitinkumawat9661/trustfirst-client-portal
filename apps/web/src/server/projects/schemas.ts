import {
  DeliverableReviewStatus,
  ProjectLifecycleStatus,
  ProjectPriority,
  ProjectTaskStatus,
} from "@trustfirst/database";
import { z } from "zod";

export const projectCreateSchema = z.object({
  clientId: z.string().optional(),
  description: z.string().max(5000).optional(),
  managerId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().min(3).max(200),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  progress: z.number().int().min(0).max(100).optional(),
});

export const projectStatusSchema = z.object({
  reason: z.string().max(1000).optional(),
  status: z.nativeEnum(ProjectLifecycleStatus),
});

export const milestoneSchema = z.object({
  dependencies: z.array(z.string()).optional(),
  description: z.string().max(1000).optional(),
  dueAt: z.coerce.date().optional(),
  name: z.string().min(2).max(200),
  progress: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

export const milestoneUpdateSchema = milestoneSchema.partial().extend({
  completed: z.boolean().optional(),
  status: z.string().max(60).optional(),
});

export const taskSchema = z.object({
  assigneeId: z.string().optional(),
  checklist: z.array(z.object({ done: z.boolean(), label: z.string() })).optional(),
  description: z.string().max(5000).optional(),
  dueAt: z.coerce.date().optional(),
  estimatedHours: z.number().min(0).optional(),
  labelNames: z.array(z.string().min(1).max(60)).optional(),
  milestoneId: z.string().optional(),
  parentId: z.string().optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  title: z.string().min(2).max(240),
});

export const taskUpdateSchema = taskSchema.partial().extend({
  actualHours: z.number().min(0).optional(),
  status: z.nativeEnum(ProjectTaskStatus).optional(),
});

export const deliverableSchema = z.object({
  description: z.string().max(5000).optional(),
  dueAt: z.coerce.date().optional(),
  milestoneId: z.string().optional(),
  requirementId: z.string().optional(),
  requirementVersion: z.number().int().positive().optional(),
  title: z.string().min(2).max(240),
});

export const deliverableReviewSchema = z.object({
  clientApprovalStatus: z.string().max(80).optional(),
  reviewStatus: z.nativeEnum(DeliverableReviewStatus),
});

export const projectAttachmentSchema = z.object({
  deliverableId: z.string().optional(),
  mimeType: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().min(1).max(500),
});

export const projectSearchSchema = z.object({
  q: z.string().min(1).max(100),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectStatusInput = z.infer<typeof projectStatusSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;
export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type DeliverableInput = z.infer<typeof deliverableSchema>;
export type DeliverableReviewInput = z.infer<typeof deliverableReviewSchema>;
export type ProjectAttachmentInput = z.infer<typeof projectAttachmentSchema>;

