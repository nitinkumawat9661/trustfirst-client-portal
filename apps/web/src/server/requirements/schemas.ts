import { RequirementPriority, RequirementStatus } from "@trustfirst/database";
import { z } from "zod";

export const requirementFormSchema = z.object({
  sections: z.array(
    z.object({
      description: z.string().optional(),
      groups: z.array(
        z.object({
          description: z.string().optional(),
          fields: z.array(
            z.object({
              conditions: z
                .array(
                  z.object({
                    fieldKey: z.string(),
                    operator: z.enum(["equals", "not_equals", "contains", "exists"]),
                    value: z.unknown().optional(),
                  }),
                )
                .optional(),
              helpText: z.string().optional(),
              key: z.string().min(1),
              label: z.string().min(1),
              options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
              required: z.boolean().optional(),
              rules: z
                .array(
                  z.object({
                    message: z.string(),
                    type: z.enum([
                      "required",
                      "min",
                      "max",
                      "minLength",
                      "maxLength",
                      "pattern",
                    ]),
                    value: z.union([z.string(), z.number()]).optional(),
                  }),
                )
                .optional(),
              type: z.enum([
                "text",
                "textarea",
                "number",
                "select",
                "multi_select",
                "checkbox",
                "date",
                "attachment",
              ]),
            }),
          ),
          key: z.string().min(1),
          label: z.string().min(1),
          repeatable: z.boolean().optional(),
        }),
      ),
      key: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
  version: z.number().int().positive(),
});

export const requirementCreateSchema = z.object({
  clientId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  formSchema: requirementFormSchema,
  ownerId: z.string().optional(),
  priority: z.nativeEnum(RequirementPriority).optional(),
  reviewerId: z.string().optional(),
  summary: z.string().max(1000).optional(),
  title: z.string().min(3).max(200),
});

export const requirementDraftSaveSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  source: z.enum(["autosave", "manual"]).default("manual"),
});

export const requirementSubmitSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export const requirementApprovalSchema = z.object({
  reason: z.string().max(1000).optional(),
  status: z.enum(["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"]),
});

export const requirementAssignmentSchema = z.object({
  dueAt: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  priority: z.nativeEnum(RequirementPriority).optional(),
  reviewerId: z.string().optional(),
});

export const requirementCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
  parentId: z.string().optional(),
});

export const requirementAttachmentSchema = z.object({
  mimeType: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().min(1).max(500),
  version: z.number().int().positive().optional(),
});

export const versionRestoreSchema = z.object({
  version: z.number().int().positive(),
});

export type RequirementCreateInput = z.infer<typeof requirementCreateSchema>;
export type RequirementDraftSaveInput = z.infer<typeof requirementDraftSaveSchema>;
export type RequirementSubmitInput = z.infer<typeof requirementSubmitSchema>;
export type RequirementApprovalInput = z.infer<typeof requirementApprovalSchema>;
export type RequirementAssignmentInput = z.infer<typeof requirementAssignmentSchema>;
export type RequirementCommentInput = z.infer<typeof requirementCommentSchema>;
export type RequirementAttachmentInput = z.infer<typeof requirementAttachmentSchema>;

export const reviewStatuses = new Set<RequirementStatus>([
  RequirementStatus.PENDING,
  RequirementStatus.UNDER_REVIEW,
  RequirementStatus.CHANGES_REQUESTED,
]);

